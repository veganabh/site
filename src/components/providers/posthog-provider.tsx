"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import posthog from "posthog-js";

import { useSession } from "@/lib/auth/use-session";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com";

/**
 * Inicializa o PostHog (analytics comportamental) e dispara pageviews em cada
 * mudança de rota. Identifica usuário logado (distinct_id = profile id).
 *
 * Dormente sem `NEXT_PUBLIC_POSTHOG_KEY` — nada roda até a key existir.
 * `capture_pageview: false` porque o App Router não dispara o pageview nativo
 * de forma confiável; fazemos manual no efeito de pathname.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  // Init uma vez
  useEffect(() => {
    if (!KEY || posthog.__loaded) return;
    posthog.init(KEY, {
      api_host: HOST,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: "localStorage+cookie",
    });
  }, []);

  return <PostHogTracker>{children}</PostHogTracker>;
}

function PostHogTracker({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status, user } = useSession();

  // Pageview manual a cada navegação
  useEffect(() => {
    if (!KEY || !posthog.__loaded) return;
    posthog.capture("$pageview", { $current_url: pathname });
  }, [pathname]);

  // Identify / reset conforme sessão
  useEffect(() => {
    if (status === "authed" && user) {
      identifyUser(user.id, { email: user.email, name: user.name, role: user.role });
    } else if (status === "anon") {
      resetAnalytics();
    }
  }, [status, user]);

  return <>{children}</>;
}
