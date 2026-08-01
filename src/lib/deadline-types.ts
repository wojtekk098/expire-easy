export type ItemStatus = "expired" | "urgent" | "soon" | "valid";

export type Item = {
  id: string;
  name: string;
  category: string;
  expiry_date: string; // YYYY-MM-DD
  notes?: string;
  reminder_days_before: number[];
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
  return new Date(y, (m ?? 1) - 1, d ?? 1);
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
