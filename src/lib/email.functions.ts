import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Czy wysyłka e-maili jest gotowa (zweryfikowana domena notify.mojdeadline.pl). */
export const getEmailProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const configured = Boolean(process.env["LOVABLE_API_KEY"] || process.env["RESEND_API_KEY"]);
  return { configured, from: "Deadline <noreply@notify.mojdeadline.pl>" };
});

/** Wysyła testowe przypomnienie na adres zalogowanego użytkownika. */
export const sendTestReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(254) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { sendAppEmail } = await import("./mailer.server");
    const ok = await sendAppEmail(
      data.email,
      "Deadline — testowe przypomnienie",
      `<div style="font-family:Arial,sans-serif;color:#1c1c1a">
            <h2 style="color:#0F4C4C;margin:0 0 12px">Przypomnienia działają</h2>
            <p style="margin:0 0 10px">To wiadomość testowa z aplikacji Deadline.</p>
            <p style="margin:0 0 10px">Prawdziwe przypomnienia wyglądają tak:
              <strong>„Polisa OC wygasa za 7 dni (15.08.2026)”</strong>.</p>
            <p style="margin:0;color:#6b7280;font-size:12px">Wysłano na ${data.email}</p>
          </div>`,
    );
    if (!ok) {
      return { sent: false as const, reason: "Wysyłka nie udała się. Sprawdź logi wysyłki e-maili." };
    }
    return { sent: true as const };
  });

