import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().email().max(254);

const itemSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  expiry_date: z.string(),
  notes: z.string().optional(),
  reminder_days_before: z.array(z.number()),
});

export const getReminderSubscription = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => z.object({ token: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { admin } = await import("./reminders.server");
    const supabase = await admin();
    const { data: row } = await supabase
      .from("reminder_subscriptions")
      .select("token, email, enabled, confirmed_at, timezone")
      .eq("token", data.token)
      .maybeSingle();
    if (!row) return null;
    return {
      token: row.token as string,
      email: row.email as string,
      enabled: row.enabled as boolean,
      confirmed: Boolean(row.confirmed_at),
    };
  });

export const saveReminderSubscription = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { token?: string; email: string; enabled: boolean; items: unknown[] }) =>
      z
        .object({
          token: z.string().uuid().optional(),
          email: emailSchema,
          enabled: z.boolean(),
          items: z.array(itemSchema).max(500),
        })
        .parse(data),
  )
  .handler(async ({ data }) => {
    const { admin, normalizeItems } = await import("./reminders.server");
    const supabase = await admin();
    const items = normalizeItems(data.items);

    if (data.token) {
      const { data: row, error } = await supabase
        .from("reminder_subscriptions")
        .update({
          email: data.email,
          enabled: data.enabled,
          items,
          confirmed_at: new Date().toISOString(),
        })
        .eq("token", data.token)
        .select("token")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (row) return { token: row.token as string };
    }

    const { data: inserted, error: insertError } = await supabase
      .from("reminder_subscriptions")
      .insert({
        email: data.email,
        enabled: data.enabled,
        items,
        confirmed_at: new Date().toISOString(),
      })
      .select("token")
      .single();
    if (insertError) throw new Error(insertError.message);
    return { token: inserted.token as string };
  });

export const syncReminderItems = createServerFn({ method: "POST" })
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
