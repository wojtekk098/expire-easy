// Server-only helpers for the reminder subscription stored in Lovable Cloud.
import type { Item } from "./deadline-types";

export type SubscriptionRow = {
  id: string;
  token: string;
  email: string;
  enabled: boolean;
  confirmed_at: string | null;
  timezone: string;
  items: Item[];
};

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function normalizeItems(items: unknown): Item[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((i): i is Item => !!i && typeof i === "object")
    .slice(0, 500)
    .map((i) => ({
      id: String(i.id),
      name: String(i.name ?? "").slice(0, 200),
      category: String(i.category ?? "").slice(0, 100),
      expiry_date: String(i.expiry_date ?? "").slice(0, 10),
      notes: i.notes ? String(i.notes).slice(0, 1000) : undefined,
      reminder_days_before: Array.isArray(i.reminder_days_before)
        ? i.reminder_days_before.map((d) => Number(d)).filter((d) => Number.isFinite(d) && d >= 0)
        : [],
    }));
}
