import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Czy klucz API do wysyłki e-maili jest zapisany na serwerze. Nie zwraca podglądu klucza. */
export const getEmailProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const key = process.env["RESEND_API_KEY"] ?? "";
  const from = process.env["RESEND_FROM"] ?? "";
  return {
    configured: key.length > 0,
    from: from || "Deadline <onboarding@resend.dev>",
  };
});

/** Wysyła testowe przypomnienie na adres zalogowanego użytkownika. */
export const sendTestReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { email: string }) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(254) }).parse(data),
  )
  .handler(async ({ data }) => {
    const key = process.env["RESEND_API_KEY"];
    if (!key) {
      return { sent: false as const, reason: "Brak klucza API do wysyłki e-maili." };
    }
    const from = process.env["RESEND_FROM"] ?? "Deadline <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: [data.email],
        subject: "Deadline — testowe przypomnienie",
        html: `<div style="font-family:Arial,sans-serif;color:#1c1c1a">
            <h2 style="color:#0F4C4C;margin:0 0 12px">Przypomnienia działają</h2>
            <p style="margin:0 0 10px">To wiadomość testowa z aplikacji Deadline.</p>
            <p style="margin:0 0 10px">Prawdziwe przypomnienia wyglądają tak:
              <strong>„Polisa OC wygasa za 7 dni (15.08.2026)”</strong>.</p>
            <p style="margin:0;color:#6b7280;font-size:12px">Wysłano na ${data.email}</p>
          </div>`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`Resend request failed [${response.status}]: ${body}`);
      return {
        sent: false as const,
        reason:
          response.status === 401 || response.status === 403
            ? "Klucz API został odrzucony albo adres nadawcy nie jest zweryfikowany w Resend."
            : `Wysyłka nie udała się (kod ${response.status}).`,
      };
    }

    return { sent: true as const };
  });
