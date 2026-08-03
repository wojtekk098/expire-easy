/**
 * Przechowywanie kluczy połączeń App User Connector — wyłącznie po stronie serwera,
 * zawsze zaszyfrowane i powiązane z zalogowanym użytkownikiem aplikacji.
 */
import { decryptConnectionKey, encryptConnectionKey } from "./connectionKeyCrypto.server";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function saveConnectionKeyForUser(
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
): Promise<void> {
  const supabase = await admin();
  const { error } = await supabase.from("app_user_connections").upsert(
    {
      user_id: userId,
      connector_id: connectorId,
      connection_key_ciphertext: encryptConnectionKey(connectionAPIKey),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,connector_id" },
  );
  if (error) throw new Error(error.message);
}

export async function getConnectionKeyForUser(
  userId: string,
  connectorId: string,
): Promise<string | null> {
  const supabase = await admin();
  const { data, error } = await supabase
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? decryptConnectionKey(data.connection_key_ciphertext as string) : null;
}

export async function deleteConnectionForUser(
  userId: string,
  connectorId: string,
): Promise<void> {
  const supabase = await admin();
  await supabase
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}
