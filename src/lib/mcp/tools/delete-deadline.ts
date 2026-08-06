import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "delete_deadline",
  title: "Usuń termin",
  description: "Trwale usuwa termin zalogowanego użytkownika.",
  inputSchema: { id: z.string().describe("Identyfikator terminu (UUID).") },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Brak autoryzacji." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("deadlines")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return { content: [{ type: "text", text: "Nie znaleziono terminu." }], isError: true };
    }
    return { content: [{ type: "text", text: `Usunięto termin ${id}.` }] };
  },
});
