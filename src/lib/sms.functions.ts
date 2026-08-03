import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Normalizuje polski numer do formatu E.164 (+48…). */
export function toE164(input: string): string | null {
  const trimmed = input.replace(/[\s()-]/g, "");
  if (/^\+\d{8,15}$/.test(trimmed)) return trimmed;
  if (/^\d{9}$/.test(trimmed)) return `+48${trimmed}`;
  if (/^00\d{8,15}$/.test(trimmed)) return `+${trimmed.slice(2)}`;
  return null;
}

/** Czy bramka SMS (Twilio) jest skonfigurowana na serwerze. */
export const getSmsProviderStatus = createServerFn({ method: "GET" }).handler(async () => {
  const accountSid = process.env["TWILIO_ACCOUNT_SID"] ?? "";
  const keySid = process.env["TWILIO_API_KEY_SID"] ?? "";
  const keySecret = process.env["TWILIO_API_KEY_SECRET"] ?? "";
  const from = process.env["TWILIO_FROM"] ?? "";
  return {
    configured: Boolean(accountSid && keySid && keySecret && from),
    accountPreview: accountSid ? `${accountSid.slice(0, 6)}…${accountSid.slice(-4)}` : null,
    from: from || null,
    missing: [
      accountSid ? null : "TWILIO_ACCOUNT_SID",
      keySid ? null : "TWILIO_API_KEY_SID",
      keySecret ? null : "TWILIO_API_KEY_SECRET",
      from ? null : "TWILIO_FROM",
    ].filter((v): v is string => v !== null),
  };
});

interface TwilioResult {
  sent: boolean;
  to: string;
  from: string;
  usedTrialTemplate: boolean;
  reason?: string;
  diagnostics?: {
    httpStatus: number;
    providerCode: number | null;
    providerMessage: string | null;
    moreInfo: string | null;
    to: string;
    from: string;
    rawBody: string;
  };
}

async function sendTwilioMessage(
  accountSid: string,
  keySid: string,
  keySecret: string,
  from: string,
  to: string,
  body: string,
): Promise<TwilioResult> {
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${keySid}:${keySecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: from,
        Body: body,
      }),
    },
  );

  if (!response.ok) {
    const rawBody = await response.text();
    console.error(`Twilio request failed [${response.status}]: ${rawBody}`);
    let providerMessage = "";
    let providerCode: number | null = null;
    let moreInfo: string | null = null;
    try {
      const parsed = JSON.parse(rawBody) as {
        message?: string;
        code?: number;
        more_info?: string;
      };
      providerMessage = String(parsed.message ?? "");
      providerCode = typeof parsed.code === "number" ? parsed.code : null;
      moreInfo = parsed.more_info ?? null;
    } catch {
      providerMessage = "";
    }
    return {
      sent: false,
      to,
      from,
      usedTrialTemplate: false,
      reason:
        response.status === 401
          ? "Twilio odrzucił dane dostępowe — sprawdź SID konta i klucz API."
          : providerMessage || `Wysyłka nie udała się (kod ${response.status}).`,
      diagnostics: {
        httpStatus: response.status,
        providerCode,
        providerMessage: providerMessage || null,
        moreInfo,
        to,
        from,
        rawBody: rawBody.slice(0, 1500),
      },
    };
  }

  return { sent: true, to, from, usedTrialTemplate: false };
}

/** Wysyła testowy SMS na podany numer zalogowanego użytkownika. */
export const sendTestSms = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { phone: string }) =>
    z.object({ phone: z.string().trim().min(9).max(24) }).parse(data),
  )
  .handler(async ({ data }) => {
    const accountSid = process.env["TWILIO_ACCOUNT_SID"];
    const keySid = process.env["TWILIO_API_KEY_SID"];
    const keySecret = process.env["TWILIO_API_KEY_SECRET"];
    const from = process.env["TWILIO_FROM"];

    if (!accountSid || !keySid || !keySecret || !from) {
      return { sent: false as const, reason: "Bramka SMS nie jest jeszcze skonfigurowana." };
    }

    const to = toE164(data.phone);
    if (!to) {
      return {
        sent: false as const,
        reason: "Podaj numer w formacie międzynarodowym, np. +48601234567.",
        diagnostics: null,
      };
    }

    // Konto pełne: wysyłamy własną treść.
    const custom = await sendTwilioMessage(
      accountSid,
      keySid,
      keySecret,
      from,
      to,
      "Testowy SMS z Deadline.",
    );
    if (custom.sent) {
      return { sent: true as const, to, usedTrialTemplate: false as const, diagnostics: null };
    }

    // Twilio trial wymaga używania predefiniowanych szablonów (błąd 572006).
    // Jednym z dostępnych szablonów jest „sms_appointment_reminders” — pasuje do przypomnień.
    const isTrialTemplateError = custom.diagnostics?.providerCode === 572006;
    if (isTrialTemplateError) {
      const trial = await sendTwilioMessage(
        accountSid,
        keySid,
        keySecret,
        from,
        to,
        "sms_appointment_reminders",
      );
      if (trial.sent) {
        return {
          sent: true as const,
          to,
          usedTrialTemplate: true as const,
          diagnostics: null,
        };
      }
      // Jeśli szablon też nie przeszedł, zwróć błąd z pierwszej próby z dopiskiem.
      return {
        sent: false as const,
        reason:
          "Konto Twilio jest w trybie trial i nie akceptuje niestandardowej treści. " +
          "Spróbuj też szablonu „sms_appointment_reminders” lub doładuj konto Twilio.",
        diagnostics: custom.diagnostics ?? null,
      };
    }

    return {
      sent: false as const,
      reason: custom.reason ?? "Wysyłka nie udała się.",
      diagnostics: custom.diagnostics ?? null,
    };
  });
