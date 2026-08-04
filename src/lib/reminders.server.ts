// Server-only helpers for the reminder subscription stored in Lovable Cloud.
import { recurrenceOccurrences, type Item } from "./deadline-types";

export type SubscriptionRow = {
  id: string;
  token: string;
  email: string;
  enabled: boolean;
  confirmed_at: string | null;
  timezone: string;
  items: Item[];
};

/** Ile kolejnych wystąpień terminu cyklicznego planujemy z góry. */
const RECURRENCE_LOOKAHEAD = 6;

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function normalizeItems(items: unknown): Item[] {
  if (!Array.isArray(items)) return [];
  const base = items
    .filter((i): i is Item => !!i && typeof i === "object")
    .slice(0, 500)
    .map((i) => {
      const notes = i.notes ? String(i.notes).slice(0, 1000) : "";
      return {
        id: String(i.id),
        name: String(i.name ?? "").slice(0, 200),
        category: String(i.category ?? "").slice(0, 100),
        expiry_date: String(i.expiry_date ?? "").slice(0, 10),
        ...(notes ? { notes } : {}),
        reminder_days_before: Array.isArray(i.reminder_days_before)
          ? i.reminder_days_before.map((d) => Number(d)).filter((d) => Number.isFinite(d) && d >= 0)
          : [],
        contact_name: i.contact_name ? String(i.contact_name).slice(0, 200) : null,
        contact_email: i.contact_email ? String(i.contact_email).slice(0, 254) : null,
        contact_phone: i.contact_phone ? String(i.contact_phone).slice(0, 40) : null,
        is_recurring: Boolean(i.is_recurring),
        recurrence_rule: i.recurrence_rule ? String(i.recurrence_rule).slice(0, 100) : null,
      } as Item;
    });

  return expandRecurring(base);
}

/**
 * Terminy cykliczne rozwijamy na kolejne wystąpienia, żeby codzienna wysyłka
 * przypomnień traktowała je dokładnie tak samo jak terminy jednorazowe.
 * Każde wystąpienie ma własny `id` (`<id>@<data>`), więc `reminder_sends`
 * nie pomyli ich ze sobą.
 */
export function expandRecurring(items: Item[]): Item[] {
  const out: Item[] = [];
  for (const item of items) {
    out.push(item);
    if (!item.is_recurring || !item.recurrence_rule) continue;
    for (const iso of recurrenceOccurrences(
      item.expiry_date,
      item.recurrence_rule,
      RECURRENCE_LOOKAHEAD,
    )) {
      out.push({ ...item, id: `${item.id}@${iso}`, expiry_date: iso });
    }
  }
  return out.slice(0, 2000);
}

/**
 * Double opt-in: wysyłamy link potwierdzający na podany adres.
 * Dopóki adresat nie kliknie, subskrypcja ma confirmed_at = null i nie
 * bierze udziału w wysyłce przypomnień.
 */
export async function sendConfirmationEmail(
  email: string,
  confirmToken: string,
  origin: string,
): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  const from = process.env["RESEND_FROM"] ?? "Deadline <onboarding@resend.dev>";
  const safeOrigin = /^https?:\/\/[^\s"'<>]+$/.test(origin)
    ? origin.replace(/\/$/, "")
    : "https://mojdeadline.pl";
  const link = `${safeOrigin}/potwierdz-przypomnienia?token=${encodeURIComponent(confirmToken)}`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "Potwierdź przypomnienia z Deadline",
      html: `<div style="font-family:Arial,sans-serif;color:#1c1c1a">
          <h2 style="color:#0F4C4C;margin:0 0 12px">Potwierdź adres e-mail</h2>
          <p style="margin:0 0 10px">Ktoś zapisał ten adres do przypomnień o terminach w aplikacji Deadline.</p>
          <p style="margin:0 0 16px">Jeśli to Ty, kliknij poniższy link. Bez potwierdzenia nie wyślemy żadnych przypomnień.</p>
          <p style="margin:0 0 16px"><a href="${link}" style="color:#0F4C4C">Potwierdzam przypomnienia</a></p>
          <p style="margin:0;color:#6b7280;font-size:12px">Jeśli to nie Ty, zignoruj tę wiadomość.</p>
        </div>`,
    }),
  });
  if (!response.ok) {
    console.error(`Resend confirmation failed [${response.status}]`);
    return false;
  }
  return true;
}
