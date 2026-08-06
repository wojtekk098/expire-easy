import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Aktywacja kodu promocyjnego — ścieżka niezależna od płatności. */
export const redeemPromoCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) => {
    const code = String(data.code ?? "")
      .trim()
      .toUpperCase();
    if (!/^[A-Z0-9._-]{3,64}$/.test(code)) throw new Error("Nieprawidłowy lub wygasły kod");
    return { code };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = context.userId;

    const { data: promo } = await supabaseAdmin
      .from("promo_codes")
      .select("id, duration_days, max_uses, current_uses, expires_at, is_active")
      .eq("code", data.code)
      .maybeSingle();

    if (!promo || !promo.is_active) return { ok: false as const, error: "invalid" as const };
    if (promo.expires_at && new Date(promo.expires_at).getTime() < Date.now()) {
      return { ok: false as const, error: "invalid" as const };
    }
    if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
      return { ok: false as const, error: "limit" as const };
    }

    const { error: redemptionError } = await supabaseAdmin
      .from("promo_code_redemptions")
      .insert({ user_id: userId, promo_code_id: promo.id });
    if (redemptionError) {
      if (redemptionError.code === "23505") return { ok: false as const, error: "already" as const };
      console.error("Promo redemption insert failed", redemptionError);
      return { ok: false as const, error: "invalid" as const };
    }

    // Nie skracamy istniejącego dostępu — liczymy od późniejszej z dat.
    const { data: access } = await supabaseAdmin
      .from("pro_access")
      .select("pro_until")
      .eq("user_id", userId)
      .maybeSingle();

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const base = Math.max(
      Date.now(),
      access?.pro_until ? new Date(access.pro_until).getTime() : 0,
      sub?.current_period_end ? new Date(sub.current_period_end).getTime() : 0,
    );
    const proUntil = new Date(base + promo.duration_days * 24 * 60 * 60 * 1000).toISOString();

    const { error: accessError } = await supabaseAdmin
      .from("pro_access")
      .upsert({ user_id: userId, pro_until: proUntil }, { onConflict: "user_id" });
    if (accessError) {
      console.error("Pro access upsert failed", accessError);
      return { ok: false as const, error: "invalid" as const };
    }

    await supabaseAdmin
      .from("promo_codes")
      .update({ current_uses: promo.current_uses + 1 })
      .eq("id", promo.id);

    return { ok: true as const, proUntil };
  });
