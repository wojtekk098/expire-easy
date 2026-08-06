import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_deadline",
  title: "Zaktualizuj termin",
  description:
    "Aktualizuje istniejący termin zalogowanego użytkownika. Podaj tylko pola, które mają się zmienić.",
  inputSchema: {
    id: z.string().describe("Identyfikator terminu (UUID)."),
    name: z.string().optional(),
    expiry_date: z.string().optional().describe("Nowa data ważności w formacie YYYY-MM-DD."),
    category: z.string().optional(),
    notes: z.string().optional(),
    contact_name: z.string().optional(),
    contact_email: z.string().optional(),
    contact_phone: z.string().optional(),
    reminder_days_before: z.array(z.number().int()).optional(),
    notify_email: z.boolean().optional(),
    notify_sms: z.boolean().optional(),
    notify_time: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...fields }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Brak autoryzacji." }], isError: true };
    }
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== undefined),
    );
    if (Object.keys(patch).length === 0) {
      return { content: [{ type: "text", text: "Brak pól do aktualizacji." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("deadlines")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Nie znaleziono terminu." }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { item: data },
    };
  },
});
