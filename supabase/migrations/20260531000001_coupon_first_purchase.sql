-- ============================================================================
-- Migration: coupon_first_purchase
-- Adiciona elegibilidade de cupom (ALL | FIRST_PURCHASE) e ensina o RPC
-- validate_coupon a checar o histórico do usuário (campanha de estreia).
-- ============================================================================

-- 1. Coluna de elegibilidade.
--    Default 'ALL' → todos os cupons já existentes continuam valendo pra todos.
alter table public.coupons
  add column if not exists eligibility text not null default 'ALL'
    check (eligibility in ('ALL', 'FIRST_PURCHASE'));

comment on column public.coupons.eligibility is
  'Quem pode usar: ALL = qualquer cliente; FIRST_PURCHASE = só quem ainda não tem pedido pago.';

-- 2. RPC validate_coupon ganha p_user_id pra checar elegibilidade de estreia.
--    A assinatura antiga (text, integer) é substituída pela de 3 args com
--    default null — chamadas legadas com 2 args continuam casando.
drop function if exists public.validate_coupon(text, integer);

create or replace function public.validate_coupon(
  p_code text,
  p_cart_total_cents integer,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
  v_discount_cents integer;
begin
  -- Busca o cupom pelo código (case-insensitive), ignorando deletados
  select * into v_coupon
  from public.coupons
  where upper(code) = upper(p_code)
    and deleted_at is null;

  if not found then
    return jsonb_build_object('valid', false, 'reason', 'not_found');
  end if;

  if v_coupon.status <> 'ATIVO' then
    return jsonb_build_object('valid', false, 'reason', 'inactive');
  end if;

  if v_coupon.valid_from > now() then
    return jsonb_build_object('valid', false, 'reason', 'not_yet_valid');
  end if;

  if v_coupon.valid_until is not null and v_coupon.valid_until < now() then
    return jsonb_build_object('valid', false, 'reason', 'expired');
  end if;

  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;

  -- Elegibilidade de estreia: só vale pra quem ainda não pagou nenhum pedido.
  -- Checado antes do valor mínimo: "você pode usar" vem antes de "atingiu o mínimo".
  if v_coupon.eligibility = 'FIRST_PURCHASE' then
    if p_user_id is null then
      return jsonb_build_object('valid', false, 'reason', 'requires_login');
    end if;
    if exists (
      select 1
      from public.orders
      where profile_id = p_user_id
        and payment_status = 'PAGO'
    ) then
      return jsonb_build_object('valid', false, 'reason', 'not_first_purchase');
    end if;
  end if;

  -- Valor mínimo do pedido
  if v_coupon.min_order_value_cents is not null
     and p_cart_total_cents < v_coupon.min_order_value_cents then
    return jsonb_build_object(
      'valid', false,
      'reason', 'min_order',
      'min_order_value_cents', v_coupon.min_order_value_cents
    );
  end if;

  -- Calcula o desconto conforme o tipo
  if v_coupon.type = 'PERCENTUAL' then
    v_discount_cents := floor(p_cart_total_cents * v_coupon.value / 100.0);
  elsif v_coupon.type = 'FIXO' then
    v_discount_cents := least(v_coupon.value, p_cart_total_cents);
  else -- FRETE_GRATIS
    v_discount_cents := 0;
  end if;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', v_coupon.id,
    'type', v_coupon.type,
    'discount_cents', v_discount_cents,
    'label', v_coupon.label,
    'hint', v_coupon.hint
  );
end;
$$;

grant execute on function public.validate_coupon(text, integer, uuid) to anon, authenticated;
