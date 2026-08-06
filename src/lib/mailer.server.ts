/**
 * Wysyłka e-maili aplikacji przez zweryfikowaną domenę notify.mojdeadline.pl
 * (Lovable Emails). Działa na dowolny adres odbiorcy — zarówno w podglądzie,
 * jak i w wersji publicznej. Resend zostaje tylko jako awaryjne zapasowe łącze.
 * Tylko serwer.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

const SENDER_DOMAIN = "notify.mojdeadline.pl";
const FROM = `Deadline <noreply@${SENDER_DOMAIN}>`;

function toText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  const key = process.env["RESEND_API_KEY"];
  if (!key) return false;
  const from = process.env["RESEND_FROM"] ?? FROM;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });
  if (!response.ok) {
    console.error(`Resend fallback failed [${response.status}]: ${await response.text()}`);
    return false;
  }
  return true;
}

/** Wysyła e-mail aplikacji. Zwraca true, gdy wiadomość została przyjęta do wysyłki. */
export async function sendAppEmail(
  to: string,
  subject: string,
  html: string,
  idempotencyKey?: string,
): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (apiKey) {
    try {
      const result = await sendLovableEmail(
        {
          to,
          from: FROM,
          sender_domain: SENDER_DOMAIN,
          subject,
          html,
          text: toText(html),
          ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
        },
        { apiKey, ...(idempotencyKey ? { idempotencyKey } : {}) },
      );
      if (result.success) return true;
      console.error("Lovable email not accepted", result);
    } catch (error) {
      console.error("Lovable email send failed", error);
    }
  }
  return sendViaResend(to, subject, html);
}
