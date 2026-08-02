/** Predefiniowane kolory oznaczeń terminów (pole `color_tag`). */
export const COLOR_TAGS = [
  { value: "red", label: "Pilne / urzędowe", dot: "bg-tag-red", soft: "bg-tag-red-soft", border: "border-tag-red", text: "text-tag-red" },
  { value: "amber", label: "Płatności", dot: "bg-tag-amber", soft: "bg-tag-amber-soft", border: "border-tag-amber", text: "text-tag-amber" },
  { value: "green", label: "Wizyty klientów", dot: "bg-tag-green", soft: "bg-tag-green-soft", border: "border-tag-green", text: "text-tag-green" },
  { value: "blue", label: "Ogólne", dot: "bg-tag-blue", soft: "bg-tag-blue-soft", border: "border-tag-blue", text: "text-tag-blue" },
  { value: "violet", label: "Umowy", dot: "bg-tag-violet", soft: "bg-tag-violet-soft", border: "border-tag-violet", text: "text-tag-violet" },
  { value: "slate", label: "Bez znaczenia", dot: "bg-tag-slate", soft: "bg-tag-slate-soft", border: "border-tag-slate", text: "text-tag-slate" },
] as const;

export type ColorTag = (typeof COLOR_TAGS)[number]["value"];

const FALLBACK = COLOR_TAGS[3];

export function colorTagMeta(tag: string | null | undefined) {
  return COLOR_TAGS.find((c) => c.value === tag) ?? FALLBACK;
}

/** Godziny → minuty od północy. Zwraca null dla braku/niepoprawnej wartości. */
export function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const parts = time.split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return Math.max(0, Math.min(24 * 60 - 1, h * 60 + m));
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.round(minutes)));
  const h = `${Math.floor(clamped / 60)}`.padStart(2, "0");
  const m = `${clamped % 60}`.padStart(2, "0");
  return `${h}:${m}`;
}

export function formatTimeRange(start?: string | null, end?: string | null): string | null {
  const s = timeToMinutes(start);
  if (s === null) return null;
  const e = timeToMinutes(end);
  return e === null ? minutesToTime(s) : `${minutesToTime(s)}–${minutesToTime(e)}`;
}
