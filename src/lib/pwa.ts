/**
 * Jedyne miejsce, w którym rejestrujemy service workera aplikacji.
 * W podglądzie Lovable, w iframe i w trybie developerskim rejestracja jest
 * zablokowana (i aktywnie czyszczona), żeby nigdy nie serwować starego HTML-a.
 */

const SW_URL = "/sw.js";

function isBlockedHost(hostname: string): boolean {
  return (
    hostname.startsWith("id-preview--") ||
    hostname.startsWith("preview--") ||
    hostname === "lovableproject.com" ||
    hostname.endsWith(".lovableproject.com") ||
    hostname === "lovableproject-dev.com" ||
    hostname.endsWith(".lovableproject-dev.com") ||
    hostname === "beta.lovable.dev" ||
    hostname.endsWith(".beta.lovable.dev")
  );
}

async function unregisterAppWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((registration) => {
        const url =
          registration.active?.scriptURL ??
          registration.waiting?.scriptURL ??
          registration.installing?.scriptURL ??
          "";
        return url.endsWith(SW_URL);
      })
      .map((registration) => registration.unregister()),
  );
}

/** Rejestruje offline'owego service workera tylko w opublikowanej aplikacji. */
export function registerAppServiceWorker(): void {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const inIframe = window.self !== window.top;
  const killSwitch = new URLSearchParams(window.location.search).get("sw") === "off";
  const blocked =
    !import.meta.env.PROD || inIframe || killSwitch || isBlockedHost(window.location.hostname);

  if (blocked) {
    void unregisterAppWorker();
    return;
  }

  void navigator.serviceWorker.register(SW_URL).catch(() => undefined);
}
