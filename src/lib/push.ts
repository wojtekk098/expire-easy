/** Powiadomienia push w zainstalowanej aplikacji (PWA). */

export const PUSH_SUPPORTED =
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export type PushDevice = { endpoint: string; p256dh: string; auth: string };

function encodeKey(subscription: PushSubscription, name: "p256dh" | "auth"): string {
  const key = subscription.getKey(name);
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return window.btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Pyta o zgodę i zwraca dane subskrypcji urządzenia. */
export async function subscribeToPush(publicKey: string): Promise<PushDevice | null> {
  if (!PUSH_SUPPORTED || !publicKey) return null;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
    }));

  return {
    endpoint: subscription.endpoint,
    p256dh: encodeKey(subscription, "p256dh"),
    auth: encodeKey(subscription, "auth"),
  };
}

/** Wyłącza powiadomienia na tym urządzeniu; zwraca endpoint do usunięcia. */
export async function unsubscribeFromPush(): Promise<string | null> {
  if (!PUSH_SUPPORTED) return null;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return null;
  const { endpoint } = subscription;
  await subscription.unsubscribe();
  return endpoint;
}

/** Czy to urządzenie ma już aktywne powiadomienia. */
export async function currentPushEndpoint(): Promise<string | null> {
  if (!PUSH_SUPPORTED || Notification.permission !== "granted") return null;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  return subscription?.endpoint ?? null;
}
