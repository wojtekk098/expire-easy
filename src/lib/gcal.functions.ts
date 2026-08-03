import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
const CONNECTOR_ID = "google_calendar";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

const itemSchema = z.object({
  id: z.string().min(1).max(80),
  name: z.string().max(200),
  category: z.string().max(100).optional().default(""),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
});

/** Zamienia id pozycji na dozwolone id wydarzenia Google (base32hex). */
function eventId(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").toLowerCase();
  return `deadline${hex}`.slice(0, 1000);
}

function nextDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

/** Czy zalogowany użytkownik podłączył swój Google Calendar. */
export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientConfigured = Boolean(
      process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"],
    );
    if (!clientConfigured) return { clientConfigured: false, connected: false, email: null };

    const { getConnectionKeyForUser } = await import("./appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) return { clientConfigured: true, connected: false, email: null };

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: "/calendar/v3/calendars/primary",
    });
    if (!res.ok) {
      console.error(`Google Calendar status check failed [${res.status}]: ${await res.text()}`);
      return { clientConfigured: true, connected: false, email: null };
    }
    const calendar = (await res.json()) as { id?: string; summary?: string };
    return {
      clientConfigured: true,
      connected: true,
      email: calendar.summary ?? calendar.id ?? null,
    };
  });

/** Rozpoczyna zgodę OAuth na dostęp do kalendarza użytkownika. */
export const startGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const clientAPIKey = process.env["GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientAPIKey) {
      throw new Error("Integracja Google Calendar nie jest jeszcze skonfigurowana.");
    }
    const request = getRequest();
    if (!request) throw new Error("OAuth musi startować z żądania aplikacji.");
    const returnUrl = new URL("/oauth/google-calendar/return", request.url).toString();

    const { getConnectionKeyForUser } = await import("./appUserConnections.server");
    const existing = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);

    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: context.userId,
      clientAPIKey,
      returnUrl,
      ...(existing ? { connectionAPIKey: existing } : {}),
      credentialsConfiguration: { scopes: GOOGLE_SCOPES },
    });
    return { authorizationUrl };
  });

/** Wymienia jednorazowy kod z powrotu OAuth na klucz połączenia i zapisuje go. */
export const completeGoogleCalendarConnect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { code: string }) =>
    z.object({ code: z.string().min(1).max(2048) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(
      GATEWAY_BASE_URL,
      data.code,
    );
    if (connectorId !== CONNECTOR_ID) {
      throw new Error("Zgoda dotyczyła innej usługi niż Google Calendar.");
    }
    const { saveConnectionKeyForUser } = await import("./appUserConnections.server");
    await saveConnectionKeyForUser(context.userId, connectorId, connectionAPIKey);
    return { ok: true as const };
  });

/** Odłącza kalendarz użytkownika. */
export const disconnectGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import(
      "./appUserConnections.server"
    );
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (connectionAPIKey) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      try {
        await disconnectAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey,
          connectorId: CONNECTOR_ID,
        });
      } catch (error) {
        console.error("Google Calendar disconnect failed", error);
      }
    }
    await deleteConnectionForUser(context.userId, CONNECTOR_ID);
    return { ok: true as const };
  });

/** Zapisuje terminy jako wydarzenia w kalendarzu głównym użytkownika. */
export const syncItemsToGoogleCalendar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { items: unknown[] }) =>
    z.object({ items: z.array(itemSchema).max(300) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { getConnectionKeyForUser } = await import("./appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) {
      return { synced: 0, failed: 0, reason: "Kalendarz nie jest podłączony." as string | null };
    }
    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");

    let synced = 0;
    let failed = 0;

    for (const item of data.items) {
      const id = eventId(item.id);
      const timed = Boolean(item.start_time);
      const start = timed
        ? { dateTime: `${item.expiry_date}T${item.start_time!.slice(0, 5)}:00`, timeZone: "Europe/Warsaw" }
        : { date: item.expiry_date };
      const end = timed
        ? {
            dateTime: `${item.expiry_date}T${(item.end_time ?? item.start_time!).slice(0, 5)}:00`,
            timeZone: "Europe/Warsaw",
          }
        : { date: nextDay(item.expiry_date) };

      const body = {
        id,
        summary: `Deadline: ${item.name}`,
        description: [item.category, item.notes].filter(Boolean).join("\n"),
        start,
        end,
        reminders: { useDefault: true },
      };

      // PUT tworzy wydarzenie o znanym id albo aktualizuje istniejące — bez duplikatów.
      const res = await callAsAppUser({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectionAPIKey,
        connectorId: CONNECTOR_ID,
        path: `/calendar/v3/calendars/primary/events/${id}`,
        init: {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      });

      if (res.ok) {
        synced += 1;
        continue;
      }

      if (res.status === 404) {
        const insert = await callAsAppUser({
          gatewayBaseUrl: GATEWAY_BASE_URL,
          connectionAPIKey,
          connectorId: CONNECTOR_ID,
          path: "/calendar/v3/calendars/primary/events",
          init: {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
        });
        if (insert.ok) {
          synced += 1;
          continue;
        }
        console.error(`Google Calendar insert failed [${insert.status}]: ${await insert.text()}`);
      } else {
        console.error(`Google Calendar update failed [${res.status}]: ${await res.text()}`);
      }
      failed += 1;
    }

    return { synced, failed, reason: null as string | null };
  });
