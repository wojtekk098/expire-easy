import { z } from "zod";

export const gcalItemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(200),
  category: z.string().max(100).optional().default(""),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
});

export const gcalCodeSchema = z.object({ code: z.string().min(1).max(2048) });

export const gcalSyncSchema = z.object({ items: z.array(gcalItemSchema).max(300) });
