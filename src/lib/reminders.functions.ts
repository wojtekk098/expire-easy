import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  expiry_date: z.string(),
  notes: z.string().optional(),
  reminder_days_before: z.array(z.number()),
  contact_name: z.string().nullable().optional(),
  contact_email: z.string().nullable().optional(),
  contact_phone: z.string().nullable().optional(),
  is_recurring: z.boolean().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  notify_email: z.boolean().nullable().optional(),
  notify_sms: z.boolean().nullable().optional(),
  notify_time: z.string().nullable().optional(),
});

export const getReminderSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { admin } = await import("./reminders.server");
    const supabase = await admin();
    const { data: row } = await supabase
      .from("reminder_subscriptions")
      .select("token, email, enabled, confirmed_at, timezone, phone, sms_enabled")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return null;
    return {
      token: row.token as string,
      email: row.email as string,
      enabled: row.enabled as boolean,
      phone: (row.phone as string | null) ?? "",
      smsEnabled: Boolean(row.sms_enabled),
      confirmed: Boolean(row.confirmed_at),
    };
  });

export const saveReminderSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: {
      token?: string;
      email: string;
      enabled: boolean;
      phone?: string;
      smsEnabled?: boolean;
      items: unknown[];
      origin?: string;
    }) =>
      z
        .object({
          token: z.string().uuid().optional(),
          email: emailSchema,
          enabled: z.boolean(),
          phone: z
            .string()
            .trim()
            .max(24)
            .regex(/^\+?[0-9 ()-]*$/, "Nieprawidłowy numer telefonu")
            .optional(),
          smsEnabled: z.boolean().optional(),
          items: z.array(itemSchema).max(500),
          origin: z.string().url().max(300).optional(),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    const { admin, normalizeItems, sendConfirmationEmail } = await import("./reminders.server");
    const supabase = await admin();
    const items = normalizeItems(data.items);
    const contact = {
      phone: data.phone ? data.phone : null,
      sms_enabled: Boolean(data.smsEnabled && data.phone),
    };
    const origin = data.origin ?? "https://mojdeadline.pl";

    if (data.token) {
      const { data: existing } = await supabase
        .from("reminder_subscriptions")
        .select("email, confirmed_at, confirm_token")
        .eq("token", data.token)
        .maybeSingle();

      if (existing) {
        // Zmiana adresu unieważnia potwierdzenie — nowy adres musi
        // samodzielnie potwierdzić zapis (double opt-in).
        const emailChanged = existing.email !== data.email;
        const confirmToken = emailChanged ? crypto.randomUUID() : (existing.confirm_token as string);
        const { data: row, error } = await supabase
          .from("reminder_subscriptions")
          .update({
            email: data.email,
            enabled: data.enabled,
            ...contact,
            items,
            ...(emailChanged ? { confirmed_at: null, confirm_token: confirmToken } : {}),
          })
          .eq("token", data.token)
          .select("token, confirmed_at")
          .maybeSingle();
        if (error) throw new Error(error.message);
        if (row) {
          const confirmed = Boolean(row.confirmed_at);
          if (!confirmed) await sendConfirmationEmail(data.email, confirmToken, origin);
          return { token: row.token as string, confirmed };
        }
      }
    }

    const confirmToken = crypto.randomUUID();
    const { data: inserted, error: insertError } = await supabase
      .from("reminder_subscriptions")
      .insert({
        email: data.email,
        enabled: data.enabled,
        ...contact,
        items,
        confirmed_at: null,
        confirm_token: confirmToken,
      })
      .select("token")
      .single();
    if (insertError) throw new Error(insertError.message);
    await sendConfirmationEmail(data.email, confirmToken, origin);
    return { token: inserted.token as string, confirmed: false };
  });

export const syncReminderItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { token: string; items: unknown[] }) =>
    z.object({ token: z.string().uuid(), items: z.array(itemSchema).max(500) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { admin, normalizeItems } = await import("./reminders.server");
    const supabase = await admin();
    await supabase
      .from("reminder_subscriptions")
      .update({ items: normalizeItems(data.items) })
      .eq("token", data.token);
    return { ok: true };
  });

/** Publiczny link z maila — potwierdza adres na podstawie confirm_token. */
export const confirmReminderSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { confirmToken: string }) =>
    z.object({ confirmToken: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { admin } = await import("./reminders.server");
    const supabase = await admin();
    const { data: row, error } = await supabase
      .from("reminder_subscriptions")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("confirm_token", data.confirmToken)
      .select("email")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return { confirmed: false as const };
    return { confirmed: true as const, email: row.email as string };
  });

/** Publiczny klucz do powiadomień push w aplikacji (bezpieczny w przeglądarce). */
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => ({
  publicKey: process.env["VAPID_PUBLIC_KEY"] ?? "",
}));

const deviceSchema = z.object({
  token: z.string().uuid(),
  endpoint: z.string().url().max(600),
  p256dh: z.string().min(10).max(300),
  auth: z.string().min(5).max(200),
});

/** Rejestruje urządzenie (telefon z zainstalowaną aplikacją) do powiadomień push. */
export const savePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deviceSchema.parse(data))
  .handler(async ({ data }) => {
    const { admin } = await import("./reminders.server");
    const supabase = await admin();
    const { data: sub } = await supabase
      .from("reminder_subscriptions")
      .select("id")
      .eq("token", data.token)
      .maybeSingle();
    if (!sub) return { saved: false as const };
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        subscription_id: sub.id as string,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { saved: true as const };
  });

/** Wyłącza powiadomienia push dla tego urządzenia. */
export const deletePushDevice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ endpoint: z.string().url().max(600) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { admin } = await import("./reminders.server");
    const supabase = await admin();
    await supabase.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });
