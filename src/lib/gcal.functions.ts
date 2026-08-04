import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { gcalCodeSchema, type GoogleCalendarEvent } from "./gcal.schemas";

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

/** Pobiera wydarzenia z kalendarza głównego użytkownika (do 12 miesięcy w przód). */
export const importGoogleCalendarEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { GATEWAY_BASE_URL, CONNECTOR_ID } = await import("./gcal.server");
    const { getConnectionKeyForUser } = await import("./appUserConnections.server");
    const connectionAPIKey = await getConnectionKeyForUser(context.userId, CONNECTOR_ID);
    if (!connectionAPIKey) {
      return {
        events: [] as GoogleCalendarEvent[],
        reason: "Kalendarz nie jest podłączony." as string | null,
      };
    }

    const { callAsAppUser } = await import("@/integrations/lovable/appUserConnector");
    const now = new Date();
    const timeMax = new Date(now);
    timeMax.setFullYear(timeMax.getFullYear() + 1);

    const params = new URLSearchParams({
      timeMin: now.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/primary/events?${params.toString()}`,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`Google Calendar import failed [${res.status}]: ${body}`);
      return {
        events: [] as GoogleCalendarEvent[],
        reason: "Nie udało się odczytać wydarzeń z kalendarza." as string | null,
      };
    }

    const payload = (await res.json()) as {
      items?: {
        id?: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { date?: string; dateTime?: string };
        end?: { date?: string; dateTime?: string };
        status?: string;
      }[];
    };

    const events: GoogleCalendarEvent[] = [];
    for (const event of payload.items ?? []) {
      if (event.status === "cancelled") continue;
      const startRaw = event.start?.date ?? event.start?.dateTime;
      if (!startRaw) continue;
      const expiry_date = startRaw.slice(0, 10);
      const start_time = event.start?.dateTime ? event.start.dateTime.slice(11, 16) : null;
      const end_time = event.end?.dateTime ? event.end.dateTime.slice(11, 16) : null;
      events.push({
        source_id: event.id ?? `${expiry_date}-${event.summary ?? ""}`,
        name: (event.summary ?? "Wydarzenie z kalendarza").slice(0, 200),
        expiry_date,
        start_time,
        end_time,
        notes: [event.description, event.location].filter(Boolean).join("\n").slice(0, 1000) || null,
      });
    }

    return { events, reason: null as string | null };
  });

