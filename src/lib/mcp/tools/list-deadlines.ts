import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_deadlines",
  title: "Lista terminów",
  description:
    "Zwraca terminy ważności zalogowanego użytkownika (polisy, umowy, certyfikaty itp.), posortowane po dacie ważności.",
  inputSchema: {
    search: z.string().optional().describe("Filtr po nazwie terminu (fragment tekstu)."),
    limit: z.number().int().optional().describe("Maksymalna liczba pozycji, domyślnie 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Brak autoryzacji." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("deadlines")
      .select(
        "id,name,category,expiry_date,status,notes,contact_name,contact_email,contact_phone,notify_email,notify_sms,notify_time,reminder_days_before",
      )
      .order("expiry_date", { ascending: true })
      .limit(Math.min(Math.max(limit ?? 50, 1), 200));
    if (search) query = query.ilike("name", `%${search}%`);

    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { items: data ?? [] },
    };
  },
});
