export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const CONNECTOR_ID = "google_calendar";

export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

/** Zamienia id pozycji na dozwolone id wydarzenia Google (base32hex). */
export function eventId(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").toLowerCase();
  return `deadline${hex}`.slice(0, 1000);
}

export function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
