import { createFileRoute } from "@tanstack/react-router";

/**
 * Codzienna wysyłka przypomnień (e-mail + SMS).
 * Wywoływana przez harmonogram w bazie (pg_cron) z nagłówkiem `apikey`.
 */
async function handle(request: Request) {
  const apikey = request.headers.get("apikey") ?? "";
  const expected = process.env["SUPABASE_ANON_KEY"] ?? "";
  if (!expected || apikey !== expected) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { dispatchReminders } = await import("@/lib/reminders.server");
    const result = await dispatchReminders();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("Reminder dispatch failed", error);
    return new Response(
      JSON.stringify({ ok: false, error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

export const Route = createFileRoute("/api/public/reminders/dispatch")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
    },
  },
});
