"use client";

/**
 * Hook de dados do sino de notificações.
 *
 * - Busca as notificações ativas via API Route (GET /api/notifications).
 * - Usuários autenticados: lidas são rastreadas no servidor (notification_reads).
 * - Usuários anônimos: lidas são rastreadas em localStorage.
 * - Sem realtime no P0 — refetch a cada 5 min é suficiente para broadcast.
 */

import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { useSession } from "@/lib/auth/use-session";
import type { Notification } from "@/types/notification";

// ── Constantes ────────────────────────────────────────────────────────────────

const QUERY_KEY = ["notifications"] as const;
const STALE_TIME = 5 * 60 * 1000; // 5 min
const LS_KEY = "vegana:notif:read";

// ── localStorage helpers (anônimos) ──────────────────────────────────────────

function getLocalRead(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function setLocalRead(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]));
  } catch {
    // localStorage indisponível (ex: private mode com quota 0)
  }
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchNotifications(): Promise<Notification[]> {
  const res = await fetch("/api/notifications", { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar notificações.");
  return res.json() as Promise<Notification[]>;
}

// ── Hook principal ────────────────────────────────────────────────────────────

export type UseNotificationsReturn = {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

export function useNotifications(): UseNotificationsReturn {
  const { isAuthed } = useSession();
  const queryClient = useQueryClient();

  // Estado local de leituras anônimas (sincronizado com localStorage)
  const [localRead, setLocalReadState] = useState<Set<string>>(() => getLocalRead());

  // Sincroniza state com localStorage quando muda
  useEffect(() => {
    setLocalRead(localRead);
  }, [localRead]);

  // Query principal
  const { data = [], isLoading } = useQuery<Notification[]>({
    queryKey: QUERY_KEY,
    queryFn: fetchNotifications,
    staleTime: STALE_TIME,
    refetchOnWindowFocus: true,
  });

  // Calcula não lidas com base na fonte correta (servidor ou localStorage)
  const notifications: Notification[] = data.map((n) => ({
    ...n,
    read: isAuthed ? n.read : localRead.has(n.id),
  }));

  const unreadCount = notifications.filter((n) => !n.read).length;

  // markRead — server (authed) ou localStorage (anônimo)
  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isAuthed) {
        const { markNotificationReadAction } = await import(
          "@/server/actions/notifications"
        );
        await markNotificationReadAction(id);
      }
    },
    onMutate: async (id: string) => {
      // Optimistic update
      if (!isAuthed) {
        setLocalReadState((prev) => new Set([...prev, id]));
      }
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(QUERY_KEY);
      queryClient.setQueryData<Notification[]>(QUERY_KEY, (old = []) =>
        old.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const markRead = useCallback(
    (id: string) => {
      markReadMutation.mutate(id);
    },
    [markReadMutation],
  );

  // markAllRead
  const markAllReadMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      if (isAuthed && ids.length) {
        const { markAllNotificationsReadAction } = await import(
          "@/server/actions/notifications"
        );
        await markAllNotificationsReadAction(ids);
      }
    },
    onMutate: async (ids: string[]) => {
      if (!isAuthed) {
        setLocalReadState((prev) => new Set([...prev, ...ids]));
      }
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previous = queryClient.getQueryData<Notification[]>(QUERY_KEY);
      queryClient.setQueryData<Notification[]>(QUERY_KEY, (old = []) =>
        old.map((n) => ({ ...n, read: true })),
      );
      return { previous };
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  const markAllRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length) markAllReadMutation.mutate(unreadIds);
  }, [notifications, markAllReadMutation]);

  return { notifications, unreadCount, isLoading, markRead, markAllRead };
}
