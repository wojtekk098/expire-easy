import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { completeGoogleCalendarConnect } from "@/lib/gcal.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () =>
    pageHead({
      path: "/oauth/google-calendar/return",
      title: "Łączenie z Google Calendar",
      description:
        "Kończymy podłączanie Twojego kalendarza Google do aplikacji Deadline.",
      ogTitle: "Łączenie z Google Calendar",
      ogDescription: "Kończymy podłączanie Twojego kalendarza Google.",
      noindex: true,
    }),
  component: OAuthReturn,
  errorComponent: () => (
    <p className="p-6 text-sm text-muted-foreground">Nie udało się dokończyć połączenia.</p>
  ),
});

function OAuthReturn() {
  const [message, setMessage] = useState("Kończymy łączenie z kalendarzem…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_calendar" },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Zgoda nie została udzielona.");
      notify("appUserConnectorOAuthFailed");
      return;
    }

    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Zgoda przebiegła bez kodu wymiany.");
      notify("appUserConnectorOAuthFailed");
      return;
    }

    void completeGoogleCalendarConnect({ data: { code } })
      .then(() => notify("appUserConnectorOAuthComplete"))
      .catch(() => {
        setMessage("Nie udało się dokończyć połączenia.");
        notify("appUserConnectorOAuthFailed");
      });
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
