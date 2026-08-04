import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gcalCodeSchema, gcalSyncSchema } from "./gcal.schemas";

/** Czy zalogowany użytkownik podłączył swój Google Calendar. */
export const getGoogleCalendarStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { GATEWAY_BASE_URL, CONNECTOR_ID } = await import("./gcal.server");
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
    const { GATEWAY_BASE_URL, CONNECTOR_ID, GOOGLE_SCOPES } = await import("./gcal.server");
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
  .inputValidator((data: { code: string }) => gcalCodeSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { CONNECTOR_ID, GATEWAY_BASE_URL } = await import("./gcal.server");
    void GATEWAY_BASE_URL;
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
    const { GATEWAY_BASE_URL, CONNECTOR_ID } = await import("./gcal.server");
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
  .inputValidator((data: { items: unknown[] }) => gcalSyncSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { GATEWAY_BASE_URL, CONNECTOR_ID, eventId, nextDay } = await import("./gcal.server");
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
