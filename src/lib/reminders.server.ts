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

/** Dzisiejsza data w strefie subskrypcji (YYYY-MM-DD). */
export function todayIn(timezone: string): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

/** Różnica dni między datą terminu i „dziś” (obie jako YYYY-MM-DD). */
export function daysBetweenISO(fromISO: string, toISODate: string): number {
  const a = Date.parse(`${fromISO}T00:00:00Z`);
  const b = Date.parse(`${toISODate}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.NaN;
  return Math.round((b - a) / 86_400_000);
}

function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export function reminderSubject(item: Item, days: number): string {
  if (days === 0) return `${item.name} — termin wygasa dziś`;
  if (days === 1) return `${item.name} — termin wygasa jutro`;
  return `${item.name} — termin wygasa za ${days} dni`;
}

/** Wysyła e-mail z przypomnieniem o jednym terminie. */
export async function sendReminderEmail(
  email: string,
  item: Item,
  days: number,
): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  const from = process.env["RESEND_FROM"] ?? "Deadline <onboarding@resend.dev>";
  const subject = reminderSubject(item, days);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from,
      to: [email],
      subject,
      html: `<div style="font-family:Arial,sans-serif;color:#1c1c1a">
          <h2 style="color:#0F4C4C;margin:0 0 12px">${subject}</h2>
          <p style="margin:0 0 8px"><strong>Kategoria:</strong> ${item.category || "Inne"}</p>
          <p style="margin:0 0 8px"><strong>Data:</strong> ${dateLabel(item.expiry_date)}</p>
          ${item.notes ? `<p style="margin:0 0 8px"><strong>Notatki:</strong> ${item.notes}</p>` : ""}
          <p style="margin:16px 0 0;color:#6b7280;font-size:12px">Wiadomość z aplikacji Deadline (mojdeadline.pl).</p>
        </div>`,
    }),
  });
  if (!response.ok) {
    console.error(`Resend reminder failed [${response.status}]: ${await response.text()}`);
    return false;
  }
  return true;
}

/**
 * Wysyła SMS z przypomnieniem. Na koncie trial Twilio (błąd 572006) wysyłamy
 * predefiniowany szablon zamiast własnej treści.
 */
export async function sendReminderSms(phone: string, body: string): Promise<boolean> {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"];
  const keySid = process.env["TWILIO_API_KEY_SID"];
  const keySecret = process.env["TWILIO_API_KEY_SECRET"];
  const from = process.env["TWILIO_FROM"];
  if (!accountSid || !keySid || !keySecret || !from) return false;

  const { toE164 } = await import("./sms.functions");
  const to = toE164(phone);
  if (!to) return false;

  const post = async (text: string) =>
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keySid}:${keySecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: from, Body: text }),
    });

  let response = await post(body);
  if (!response.ok) {
    const raw = await response.text();
    let code: number | null = null;
    try {
      code = (JSON.parse(raw) as { code?: number }).code ?? null;
    } catch {
      code = null;
    }
    console.error(`Twilio reminder failed [${response.status}]: ${raw}`);
    if (code !== 572006) return false;
    response = await post("sms_appointment_reminders");
    if (!response.ok) {
      console.error(`Twilio template reminder failed [${response.status}]`);
      return false;
    }
  }
  return true;
}

export type DispatchResult = {
  subscriptions: number;
  emails: number;
  sms: number;
  skipped: number;
};

/** Codzienna wysyłka: dla każdej potwierdzonej subskrypcji sprawdza terminy. */
export async function dispatchReminders(): Promise<DispatchResult> {
  const supabase = await admin();
  const { data: subs, error } = await supabase
    .from("reminder_subscriptions")
    .select("id, email, enabled, confirmed_at, timezone, items, phone, sms_enabled")
    .eq("enabled", true)
    .not("confirmed_at", "is", null);
  if (error) throw new Error(error.message);

  const result: DispatchResult = { subscriptions: 0, emails: 0, sms: 0, skipped: 0 };

  for (const sub of subs ?? []) {
    result.subscriptions += 1;
    const today = todayIn((sub.timezone as string) ?? "Europe/Warsaw");
    const items = Array.isArray(sub.items) ? (sub.items as unknown as Item[]) : [];

    for (const item of items) {
      if (!item?.expiry_date) continue;
      const days = daysBetweenISO(today, item.expiry_date);
      if (!Number.isFinite(days) || days < 0) continue;
      const wanted = Array.isArray(item.reminder_days_before) ? item.reminder_days_before : [];
      if (!wanted.includes(days)) continue;

      // Idempotencja: jedna wysyłka na termin/próg/dzień.
      const { error: claimError } = await supabase.from("reminder_sends").insert({
        subscription_id: sub.id as string,
        item_id: String(item.id),
        days_before: days,
        sent_on: today,
      });
      if (claimError) {
        result.skipped += 1;
        continue;
      }

      if (await sendReminderEmail(sub.email as string, item, days)) result.emails += 1;
      if (sub.sms_enabled && sub.phone) {
        const ok = await sendReminderSms(
          sub.phone as string,
          `${reminderSubject(item, days)} (${dateLabel(item.expiry_date)}). Deadline`,
        );
        if (ok) result.sms += 1;
      }
    }
  }

  return result;
}
