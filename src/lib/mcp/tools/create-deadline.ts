import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_deadline",
  title: "Dodaj termin",
  description:
    "Dodaje nowy termin ważności na koncie zalogowanego użytkownika. Data w formacie YYYY-MM-DD.",
  inputSchema: {
    name: z.string().describe("Nazwa terminu, np. „Polisa OC samochodu”."),
    expiry_date: z.string().describe("Data ważności w formacie YYYY-MM-DD."),
    category: z
      .string()
      .optional()
      .describe("Kategoria, np. Polisy, Umowy, Certyfikaty. Domyślnie „Inne”."),
    notes: z.string().optional().describe("Notatki do terminu."),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    reminder_days_before: z
      .array(z.number().int())
      .optional()
      .describe("Ile dni przed terminem przypomnieć, np. [7, 1, 0]."),
    notify_email: z.boolean().optional().describe("Przypomnienie e-mail. Domyślnie włączone."),
    notify_sms: z.boolean().optional().describe("Przypomnienie SMS (wymaga planu Pro)."),
    notify_time: z.string().optional().describe("Godzina wysyłki przypomnienia, np. „08:00”."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Brak autoryzacji." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("deadlines")
      .insert({
        user_id: ctx.getUserId()!,
        name: input.name,
        expiry_date: input.expiry_date,
        category: input.category ?? "Inne",
        notes: input.notes ?? null,
        contact_name: input.contact_name ?? null,
        contact_email: input.contact_email ?? null,
        contact_phone: input.contact_phone ?? null,
        reminder_days_before: input.reminder_days_before ?? [7, 1],
        notify_email: input.notify_email ?? true,
        notify_sms: input.notify_sms ?? false,
        ...(input.notify_time ? { notify_time: input.notify_time } : {}),
      })
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { item: data },
    };
  },
});
