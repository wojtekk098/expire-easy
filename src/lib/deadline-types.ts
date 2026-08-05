export type ItemStatus = "expired" | "urgent" | "soon" | "valid";

/** Status obsługi terminu (odpowiada enumowi `deadline_status` w bazie). */
export type DeadlineStatus = "pending" | "in_progress" | "confirmed" | "rescheduled" | "done";

export const DEADLINE_STATUSES: DeadlineStatus[] = [
  "pending",
  "in_progress",
  "confirmed",
  "rescheduled",
  "done",
];

export const DEADLINE_STATUS_LABELS: Record<DeadlineStatus, string> = {
  pending: "Oczekuje",
  in_progress: "W toku",
  confirmed: "Potwierdzony",
  rescheduled: "Przeniesiony",
  done: "Zrobione",
};

export type RecurrenceRule = "weekly" | "monthly" | "quarterly" | "yearly" | (string & {});

export const RECURRENCE_OPTIONS: { value: RecurrenceRule; label: string }[] = [
  { value: "weekly", label: "Co tydzień" },
  { value: "monthly", label: "Co miesiąc" },
  { value: "quarterly", label: "Co kwartał" },
];

export const RECURRENCE_LABELS: Record<string, string> = {
  weekly: "Co tydzień",
  monthly: "Co miesiąc",
  quarterly: "Co kwartał",
  yearly: "Co rok",
};


export type Item = {
  id: string;
  name: string;
  category: string;
  expiry_date: string; // YYYY-MM-DD
  notes?: string;
  reminder_days_before: number[];
  // Rozszerzenia (wszystkie opcjonalne — stare rekordy działają bez zmian)
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  status?: DeadlineStatus | null;
  color_tag?: string | null;
  is_recurring?: boolean | null;
  recurrence_rule?: RecurrenceRule | null;
  start_time?: string | null; // HH:MM lub HH:MM:SS
  end_time?: string | null;
  /** Czy dla tego terminu wysyłać przypomnienia e-mail / SMS. */
  notify_email?: boolean | null;
  notify_sms?: boolean | null;
};


export const DEFAULT_CATEGORIES = [
  "Ubezpieczenia",
  "Certyfikaty",
  "Umowy",
  "Domeny/Hosting",
  "Licencje oprogramowania",
  "Przeglądy techniczne",
  "Inne",
];

export const DEFAULT_REMINDERS = [30, 14, 7, 1];

export const STATUS_META: Record<
  ItemStatus,
  { label: string; dot: string; badge: string; text: string }
> = {
  expired: {
    label: "Przeterminowane",
    dot: "bg-expired",
    badge: "bg-expired-soft text-expired border-expired/25",
    text: "text-expired",
  },
  urgent: {
    label: "Pilne",
    dot: "bg-urgent",
    badge: "bg-urgent-soft text-urgent border-urgent/25",
    text: "text-urgent",
  },
  soon: {
    label: "Wkrótce",
    dot: "bg-soon",
    badge: "bg-soon-soft text-soon border-soon/25",
    text: "text-soon",
  },
  valid: {
    label: "Aktualne",
    dot: "bg-valid",
    badge: "bg-valid-soft text-valid border-valid/25",
    text: "text-valid",
  },
};

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

export function toISO(date: Date): string {
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function daysLeft(iso: string): number {
  const diff = parseDate(iso).getTime() - startOfToday().getTime();
  return Math.round(diff / 86_400_000);
}

export function getStatus(iso: string): ItemStatus {
  const d = daysLeft(iso);
  if (d < 0) return "expired";
  if (d <= 7) return "urgent";
  if (d <= 30) return "soon";
  return "valid";
}

export function formatPL(iso: string): string {
  return parseDate(iso).toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Przyjazny komunikat, np. „Polisa OC wygasa za 7 dni”. */
export function friendlyMessage(item: Item): string {
  const d = daysLeft(item.expiry_date);
  if (d < 0) {
    const abs = Math.abs(d);
    return `${item.name} wygasło ${abs === 1 ? "wczoraj" : `${abs} ${plDni(abs)} temu`}`;
  }
  if (d === 0) return `${item.name} wygasa dziś`;
  if (d === 1) return `${item.name} wygasa jutro`;
  return `${item.name} wygasa za ${d} ${plDni(d)}`;
}

export function plDni(n: number): string {
  return n === 1 ? "dzień" : "dni";
}

/** Kolejne wystąpienia terminu cyklicznego (bez pierwszego, źródłowego). */
export function recurrenceOccurrences(
  iso: string,
  rule: RecurrenceRule | null | undefined,
  count = 6,
): string[] {
  if (!rule) return [];
  const base = parseDate(iso);
  const out: string[] = [];
  for (let n = 1; n <= count; n += 1) {
    const d = new Date(base);
    if (rule === "weekly") d.setDate(d.getDate() + 7 * n);
    else if (rule === "monthly") d.setMonth(d.getMonth() + n);
    else if (rule === "quarterly") d.setMonth(d.getMonth() + 3 * n);
    else if (rule === "yearly") d.setFullYear(d.getFullYear() + n);
    else return [];
    out.push(toISO(d));
  }
  return out;
}
