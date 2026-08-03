/**
 * Klientowy helper do okienka OAuth konektora (bez żadnych sekretów).
 */

export function openConnectorPopup(): Window | null {
  return window.open("", "lovable-oauth", "width=600,height=720");
}

export function waitForOAuthCompletion(popup: Window, connectorId: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    let poll: number | undefined;
    const cleanup = () => {
      window.removeEventListener("message", onMessage);
      if (poll !== undefined) window.clearInterval(poll);
    };
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; connectorId?: string } | null;
      const type = data?.type;
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        data?.connectorId !== connectorId ||
        (type !== "appUserConnectorOAuthComplete" && type !== "appUserConnectorOAuthFailed")
      ) {
        return;
      }
      cleanup();
      if (type === "appUserConnectorOAuthComplete") {
        resolve();
        return;
      }
      popup.close();
      reject(new Error("Połączenie nie zostało ukończone."));
    };
    window.addEventListener("message", onMessage);
    poll = window.setInterval(() => {
      if (!popup.closed) return;
      cleanup();
      reject(new Error("Okno logowania zostało zamknięte przed zakończeniem."));
    }, 500);
  });
}
