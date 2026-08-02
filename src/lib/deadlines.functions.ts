import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const timeSchema = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/, "Godzina w formacie HH:MM")
  .nullable();

const basePayload = {
  name: z.string().trim().min(1).max(200),
  category: z.string().trim().min(1).max(100).default("Inne"),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(2000).nullable().optional(),
  reminder_days_before: z.array(z.number().int().min(0).max(3650)).max(20).optional(),
  contact_name: z.string().max(200).nullable().optional(),
  contact_email: z.string().email().max(254).nullable().optional(),
  contact_phone: z.string().max(40).nullable().optional(),
  status: z
    .enum(["pending", "in_progress", "confirmed", "rescheduled", "done"])
    .nullable()
    .optional(),
  color_tag: z.string().max(32).nullable().optional(),
  is_recurring: z.boolean().nullable().optional(),
  recurrence_rule: z.string().max(100).nullable().optional(),
  start_time: timeSchema.optional(),
  end_time: timeSchema.optional(),
};

const createSchema = z.object(basePayload);
const updateSchema = z.object({
  id: z.string().uuid(),
  patch: z.object(basePayload).partial(),
});

const SELECT =
  "id, name, category, expiry_date, notes, reminder_days_before, contact_name, contact_email, contact_phone, status, color_tag, is_recurring, recurrence_rule, start_time, end_time, created_at, updated_at";

export const listDeadlines = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("deadlines")
      .select(SELECT)
      .eq("user_id", context.userId)
      .order("expiry_date", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("deadlines")
      .insert({ ...data, user_id: context.userId })
      .select(SELECT)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("deadlines")
      .update(data.patch)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .select(SELECT)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteDeadline = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("deadlines")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
