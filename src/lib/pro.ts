import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnvironment } from "@/lib/paddle";
import { useAuth } from "@/hooks/useAuth";

export const PRO_PRICE_PLN = 25;
export const PRO_PRICE_ID = "deadline_pro_monthly";

export const PRO_FEATURES = [
  {
    title: "Przypomnienia SMS",
    description: "Ten sam terminarz, ale wiadomość ląduje w telefonie — nawet bez dostępu do maila.",
  },
  {
    title: "Eksport i import CSV",
    description: "Przenieś terminy z Excela w jednej chwili i miej kopię wszystkiego u siebie.",
  },
  {
    title: "Raport PDF",
    description: "Czytelne zestawienie terminów do wydruku, dla biura rachunkowego albo audytu.",
  },
  {
    title: "Google Calendar",
    description: "Terminy jako wydarzenia w Twoim kalendarzu — plik .ics dodasz jednym kliknięciem.",
  },
] as const;

export type Subscription = {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  price_id: string;
};

function computeActive(sub: Subscription | null): boolean {
  if (!sub) return false;
  const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : null;
  const future = end === null || end > Date.now();
  if (["active", "trialing", "past_due"].includes(sub.status)) return future;
  if (sub.status === "canceled") return end !== null && end > Date.now();
  return false;
}

/** Status dostępu Pro na podstawie subskrypcji użytkownika. */
export function usePro(): {
  pro: boolean;
  ready: boolean;
  subscription: Subscription | null;
  refresh: () => void;
} {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setReady(true);
      return;
    }
    const { data } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end, price_id")
      .eq("user_id", user.id)
      .eq("environment", getPaddleEnvironment())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription((data as Subscription | null) ?? null);
    setReady(true);
  }, [user]);

  useEffect(() => {
    void load();
    if (!user) return;
    const channel = supabase
      .channel(`subscriptions:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load, user]);

  return { pro: computeActive(subscription), ready, subscription, refresh: () => void load() };
}
