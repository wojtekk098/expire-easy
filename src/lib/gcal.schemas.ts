import { z } from "zod";

export const gcalCodeSchema = z.object({ code: z.string().min(1).max(2048) });

/** Wydarzenie pobrane z Google Calendar, gotowe do zapisania jako termin. */
export type GoogleCalendarEvent = {
  source_id: string;
  name: string;
  expiry_date: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
};
