"use client";

import type { ComponentProps } from "react";
import { createElement } from "react";
import { resolveKitIcon } from "@/lib/kit-icons";
import type { GiftKitIconName } from "@/lib/kit-icons";
import type { LucideIcon } from "lucide-react";

type KitIconProps = { name: GiftKitIconName } & Omit<ComponentProps<LucideIcon>, "ref">;

/**
 * Render seguro de ícone de gift kit em server components.
 * `createElement` evita o lint false-positive `react-hooks/components`
 * disparado por `<Icon />` quando `Icon` vem de função (resolveKitIcon).
 */
export function KitIcon({ name, ...rest }: KitIconProps) {
  return createElement(resolveKitIcon(name), rest);
}
