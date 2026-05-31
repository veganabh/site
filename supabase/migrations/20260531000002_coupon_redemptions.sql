-- ============================================================================
-- Migration: coupon_redemptions
-- Torna `used_count` real (incrementa no pagamento) + limite de uso por pessoa.
--
-- Modelo:
-- - coupon_redemptions: 1 linha por (cupom, pedido) quando o pedido é PAGO.
--   Fonte da verdade do uso real. Unique (coupon_id, order_id) = idempotente
--   contra webhook duplicado.
-- - coupons.max_uses_per_user: quantas vezes o MESMO cliente pode usar
--   (null = ilimitado por pessoa). Checado em validate_coupon contra a
--   contagem de resgates PAGOS desse cliente.
-- - redeem_coupon / unredeem_coupon: chamadas pelo fluxo de pagamento
--   (PAGO incrementa, ESTORNADO desfaz). Atômicas.
-- ============================================================================

-- 1. Limite por pessoa no cupom.
alter table public.coupons
  add column if not exists max_uses_per_user integer
    constraint ck_coupons_max_uses_per_user_positive
      check (max_uses_per_user is null or max_uses_per_user >= 1);

comment on column public.coupons.max_uses_per_user is
  'Quantas vezes o mesmo cliente pode usar (resgates pagos). NULL = ilimitado por pessoa.';

-- 2. Tabela de resgates.
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  order_id uuid not null references public.orders(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  -- Um pedido resgata um cupom no máximo uma vez (idempotência do webhook).
  constraint uq_coupon_redemptions_coupon_order unique (coupon_id, order_id)
);

comment on table public.coupon_redemptions is
  'Registro de uso efetivo de cupom (pedido pago). Alimenta used_count e o limite por pessoa.';

create index if not exists idx_coupon_redemptions_coupon_user
  on public.coupon_redemptions (coupon_id, profile_id);

-- RLS: leitura só admin. Escrita só via service-role (RPCs abaixo / fluxo de pagamento).
alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupon_redemptions_select_admin" on public.coupon_redemptions;
create policy "coupon_redemptions_select_admin" on public.coupon_redemptions
  for select using (public.is_admin());

-- 3. validate_coupon: + checagem de limite por pessoa.
--    Recriada inteira (substitui a versão de 20260531000001).
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
  v_user_uses integer;
begin
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

  -- Limite global (used_count agora é real, alimentado por redeem_coupon).
  if v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses then
    return jsonb_build_object('valid', false, 'reason', 'exhausted');
  end if;

  -- Elegibilidade de estreia: só quem ainda não pagou nenhum pedido.
  if v_coupon.eligibility = 'FIRST_PURCHASE' then
    if p_user_id is null then
      return jsonb_build_object('valid', false, 'reason', 'requires_login');
    end if;
    if exists (
      select 1 from public.orders
      where profile_id = p_user_id and payment_status = 'PAGO'
    ) then
      return jsonb_build_object('valid', false, 'reason', 'not_first_purchase');
    end if;
  end if;

  -- Limite por pessoa: conta resgates PAGOS do cliente (não pune abandono).
  if v_coupon.max_uses_per_user is not null then
    if p_user_id is null then
      return jsonb_build_object('valid', false, 'reason', 'requires_login');
    end if;
    select count(*) into v_user_uses
    from public.coupon_redemptions
    where coupon_id = v_coupon.id and profile_id = p_user_id;
    if v_user_uses >= v_coupon.max_uses_per_user then
      return jsonb_build_object('valid', false, 'reason', 'already_used');
    end if;
  end if;

  -- Valor mínimo do pedido.
  if v_coupon.min_order_value_cents is not null
     and p_cart_total_cents < v_coupon.min_order_value_cents then
    return jsonb_build_object(
      'valid', false,
      'reason', 'min_order',
      'min_order_value_cents', v_coupon.min_order_value_cents
    );
  end if;

  if v_coupon.type = 'PERCENTUAL' then
    v_discount_cents := floor(p_cart_total_cents * v_coupon.value / 100.0);
  elsif v_coupon.type = 'FIXO' then
    v_discount_cents := least(v_coupon.value, p_cart_total_cents);
  else
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

-- 4. redeem_coupon: registra resgate + incrementa used_count (no pagamento).
--    Idempotente: ON CONFLICT não duplica; só incrementa se inseriu de fato.
create or replace function public.redeem_coupon(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
  v_profile_id uuid;
  v_rows integer;
begin
  select coupon_id, profile_id into v_coupon_id, v_profile_id
  from public.orders
  where id = p_order_id;

  if v_coupon_id is null then
    return; -- pedido sem cupom: nada a resgatar
  end if;

  insert into public.coupon_redemptions (coupon_id, profile_id, order_id)
  values (v_coupon_id, v_profile_id, p_order_id)
  on conflict (coupon_id, order_id) do nothing;

  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.coupons set used_count = used_count + 1 where id = v_coupon_id;
  end if;
end;
$$;

grant execute on function public.redeem_coupon(uuid) to authenticated, service_role;

-- 5. unredeem_coupon: desfaz resgate + decrementa used_count (no estorno).
create or replace function public.unredeem_coupon(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon_id uuid;
  v_rows integer;
begin
  delete from public.coupon_redemptions
  where order_id = p_order_id
  returning coupon_id into v_coupon_id;

  get diagnostics v_rows = row_count;
  if v_rows > 0 and v_coupon_id is not null then
    update public.coupons
    set used_count = greatest(0, used_count - 1)
    where id = v_coupon_id;
  end if;
end;
$$;

grant execute on function public.unredeem_coupon(uuid) to authenticated, service_role;
