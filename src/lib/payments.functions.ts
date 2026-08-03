import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PaddleEnv } from "@/lib/paddle.server";

const envValidator = (data: { priceId?: string; environment: PaddleEnv }) => {
  if (data.environment !== "sandbox" && data.environment !== "live") {
    throw new Error("Invalid environment");
  }
  if (data.priceId !== undefined && !/^[a-z0-9_]{1,64}$/.test(data.priceId)) {
    throw new Error("Invalid priceId");
  }
  return data;
};

/** Zamienia czytelny identyfikator ceny na wewnętrzne ID dostawcy płatności. */
export const resolvePaddlePrice = createServerFn({ method: "GET" })
  .inputValidator((data: { priceId: string; environment: PaddleEnv }) => envValidator(data))
  .handler(async ({ data }) => {
    const { gatewayFetch } = await import("@/lib/paddle.server");
    const response = await gatewayFetch(
      data.environment,
      `/prices?external_id=${encodeURIComponent(data.priceId!)}`,
    );
    if (!response.ok) {
      const body = await response.text();
      console.error(`Paddle price lookup failed [${response.status}]: ${body}`);
      throw new Error("Nie udało się pobrać ceny");
    }
    const result = (await response.json()) as { data?: Array<{ id: string }> };
    if (!result.data?.length) throw new Error("Price not found");
    return result.data[0]!.id;
  });

/** Link do panelu klienta (zmiana karty, anulowanie, faktury). */
export const createPortalSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { environment: PaddleEnv }) => envValidator(data))
  .handler(async ({ data, context }) => {
    const { data: sub, error } = await context.supabase
      .from("subscriptions")
      .select("paddle_customer_id, paddle_subscription_id, environment")
      .eq("user_id", context.userId)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error("Nie udało się odczytać subskrypcji");
    if (!sub) return { url: null as string | null };

    const { getPaddleClient } = await import("@/lib/paddle.server");
    const paddle = getPaddleClient(data.environment);
    const session = await paddle.customerPortalSessions.create(sub.paddle_customer_id, [
      sub.paddle_subscription_id,
    ]);
    return { url: session.urls.general.overview as string | null };
  });
