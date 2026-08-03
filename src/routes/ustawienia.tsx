import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  FileDown,
  FileUp,
  KeyRound,
  Mail,
  Plus,
  Smartphone,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useDeadlines, REMINDER_TOKEN_KEY } from "@/lib/deadline-store";
import {
  csvToItems,
  downloadFile,
  itemsToCSV,
  itemsToICS,
  openPDFReport,
} from "@/lib/data-transfer";
import { getEmailProviderStatus, sendTestReminderEmail } from "@/lib/email.functions";
import { getSmsProviderStatus, sendTestSms } from "@/lib/sms.functions";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  startGoogleCalendarConnect,
  syncItemsToGoogleCalendar,
} from "@/lib/gcal.functions";
import { openConnectorPopup, waitForOAuthCompletion } from "@/lib/connector-popup";
import { getReminderSubscription, saveReminderSubscription } from "@/lib/reminders.functions";
import { PRO_PRICE_PLN, usePro } from "@/lib/pro";




export const Route = createFileRoute("/ustawienia")({
  head: () => ({
    meta: [
      { title: "Ustawienia — Deadline" },
      {
        name: "description",
        content: "Ustaw adres e-mail do przypomnień i zarządzaj własnymi kategoriami terminów.",
      },
      { property: "og:title", content: "Ustawienia — Deadline" },
      {
        property: "og:description",
        content: "Powiadomienia e-mail i kategorie w aplikacji Deadline.",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { categories, items, addItem, addCategory, deleteCategory } = useDeadlines();
  const { pro } = usePro();
  const [phone, setPhone] = useState("");
  const [smsOn, setSmsOn] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [sms, setSms] = useState<{
    configured: boolean;
    accountPreview: string | null;
    from: string | null;
  } | null>(null);
  const [gcal, setGcal] = useState<{
    clientConfigured: boolean;
    connected: boolean;
    email: string | null;
  } | null>(null);
  const [gcalBusy, setGcalBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [email, setEmail] = useState("");
  const [emailOn, setEmailOn] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [testing, setTesting] = useState(false);
  const [provider, setProvider] = useState<{
    configured: boolean;
    keyPreview: string | null;
    from: string;
  } | null>(null);
  const save = useServerFn(saveReminderSubscription);
  const load = useServerFn(getReminderSubscription);
  const sendTest = useServerFn(sendTestReminderEmail);
  const providerStatus = useServerFn(getEmailProviderStatus);
  const smsStatus = useServerFn(getSmsProviderStatus);
  const sendSms = useServerFn(sendTestSms);
  const gcalStatus = useServerFn(getGoogleCalendarStatus);
  const startGcal = useServerFn(startGoogleCalendarConnect);
  const syncGcal = useServerFn(syncItemsToGoogleCalendar);
  const disconnectGcal = useServerFn(disconnectGoogleCalendar);
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  useEffect(() => {
    providerStatus().then(setProvider).catch(() => undefined);
  }, [providerStatus]);

  useEffect(() => {
    smsStatus().then(setSms).catch(() => undefined);
  }, [smsStatus]);

  useEffect(() => {
    if (!user) {
      setGcal(null);
      return;
    }
    gcalStatus().then(setGcal).catch(() => undefined);
  }, [user, gcalStatus]);

  useEffect(() => {
    if (user?.email) setEmail((current) => current || user.email!);
  }, [user]);

  useEffect(() => {
    const token = localStorage.getItem(REMINDER_TOKEN_KEY);
    if (!token) return;
    load({ data: { token } })
      .then((sub) => {
        if (!sub) return;
        setEmail(sub.email);
        setEmailOn(sub.enabled);
        setPhone(sub.phone);
        setSmsOn(sub.smsEnabled);
      })
      .catch(() => undefined);
  }, [load]);


  async function handleSave() {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      toast.error("Podaj poprawny adres e-mail");
      return;
    }
    setSaving(true);
    try {
      const token = localStorage.getItem(REMINDER_TOKEN_KEY);
      const result = await save({
        data: {
          ...(token ? { token } : {}),
          email: value,
          enabled: emailOn,
          phone: phone.trim(),
          smsEnabled: smsOn,
          items,
        },
      });
      localStorage.setItem(REMINDER_TOKEN_KEY, result.token);
      toast.success(
        emailOn
          ? "Zapisano — przypomnienia będą wysyłane na ten adres"
          : "Zapisano — przypomnienia e-mail są wyłączone",
      );
    } catch {
      toast.error("Nie udało się zapisać ustawień. Spróbuj ponownie.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ustawienia</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Zdecyduj, gdzie mamy wysyłać przypomnienia i jakich kategorii używasz.
        </p>
      </header>

      <section className="panel space-y-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Mail className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Przypomnienia e-mail</h2>
            <p className="text-sm text-muted-foreground">
              Codziennie rano sprawdzamy terminy i wysyłamy krótką wiadomość, np. „Polisa OC wygasa
              za 7 dni”.
            </p>
          </div>
          <Switch checked={emailOn} onCheckedChange={setEmailOn} aria-label="Włącz e-maile" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            type="email"
            placeholder="np. anna@mojafirma.pl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!emailOn}
          />
        </div>

        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Wysyłamy tylko dni wskazane w polu „Przypomnij” każdej pozycji. Przypomnienia SMS są
          częścią planu Pro.
        </p>

        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Zapisywanie…" : "Zapisz ustawienia"}
        </Button>
      </section>


      <section className="panel space-y-4 p-5">
        <div>
          <h2 className="text-base font-semibold">Kategorie</h2>
          <p className="text-sm text-muted-foreground">
            Dodaj własne kategorie, jeśli domyślne nie pasują do Twojej firmy.
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newCategory.trim();
            if (!name) return;
            if (categories.includes(name)) {
              toast.error("Taka kategoria już istnieje");
              return;
            }
            addCategory(name);
            setNewCategory("");
            toast.success("Kategoria dodana");
          }}
        >
          <Input
            placeholder="np. Badania okresowe"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <Button type="submit" variant="outline" className="shrink-0">
            <Plus className="size-4" />
            Dodaj
          </Button>
        </form>

        <ul className="divide-y divide-border">
          {categories.map((c) => {
            const used = items.filter((i) => i.category === c).length;
            return (
              <li key={c} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c}</p>
                  <p className="text-xs text-muted-foreground">
                    {used === 0 ? "brak pozycji" : `${used} ${used === 1 ? "pozycja" : "pozycje"}`}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Usuń kategorię ${c}`}
                  onClick={() => {
                    if (used > 0) {
                      toast.error("Najpierw przenieś pozycje z tej kategorii");
                      return;
                    }
                    deleteCategory(c);
                    toast.success("Kategoria usunięta");
                  }}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel space-y-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <KeyRound className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Klucz API do wysyłki (Resend)</h2>
            <p className="text-sm text-muted-foreground">
              Klucz przechowujemy bezpiecznie na serwerze — nigdy nie trafia do przeglądarki.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          {provider === null ? (
            <span className="text-muted-foreground">Sprawdzam konfigurację…</span>
          ) : provider.configured ? (
            <span>
              Klucz zapisany (<code className="font-mono text-xs">{provider.keyPreview}</code>),
              nadawca: <span className="font-medium">{provider.from}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">
              Brak klucza — napisz w czacie „chcę wkleić klucz Resend”, a otworzę bezpieczny
              formularz.
            </span>
          )}
        </div>

        <Button
          variant="outline"
          disabled={!user || testing || !provider?.configured}
          onClick={async () => {
            if (!user?.email) return;
            setTesting(true);
            try {
              const result = await sendTest({ data: { email: user.email } });
              if (result.sent) toast.success(`Wysłaliśmy testowy e-mail na ${user.email}`);
              else toast.error(result.reason);
            } catch {
              toast.error("Nie udało się wysłać e-maila testowego");
            } finally {
              setTesting(false);
            }
          }}
        >
          {testing ? "Wysyłam…" : "Wyślij e-mail testowy"}
        </Button>
        {!user ? (
          <p className="text-xs text-muted-foreground">
            Zaloguj się, aby wysłać wiadomość testową na adres swojego konta.
          </p>
        ) : null}
      </section>

      <section className="panel space-y-4 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Deadline Pro</h2>
            <p className="text-sm text-muted-foreground">
              {pro
                ? "Dostęp aktywny — SMS-y, CSV, PDF i kalendarz są do Twojej dyspozycji."
                : `SMS-y, eksport i import CSV, raport PDF oraz Google Calendar za ${PRO_PRICE_PLN} zł/mies.`}
            </p>
          </div>
        </div>

        {!pro ? (
          <Button asChild>
            <Link to="/pro">Zobacz plan Pro</Link>
          </Button>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <Label htmlFor="phone" className="flex items-center gap-1.5">
                    <Smartphone className="size-3.5" />
                    Przypomnienia SMS
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Wysyłamy krótki SMS w dniach wskazanych w polu „Przypomnij”.
                  </p>
                </div>
                <Switch
                  checked={smsOn}
                  onCheckedChange={setSmsOn}
                  aria-label="Włącz przypomnienia SMS"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  id="phone"
                  type="tel"
                  placeholder="np. +48 601 234 567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!smsOn}
                />
                <Button
                  variant="outline"
                  className="shrink-0"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  Zapisz numer
                </Button>
              </div>

              <div className="rounded-lg bg-muted px-3 py-2 text-sm">
                {sms === null ? (
                  <span className="text-muted-foreground">Sprawdzam bramkę SMS…</span>
                ) : sms.configured ? (
                  <span>
                    Bramka Twilio podłączona (konto{" "}
                    <code className="font-mono text-xs">{sms.accountPreview}</code>), nadawca:{" "}
                    <span className="font-medium">{sms.from}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Bramka Twilio nie jest jeszcze gotowa — napisz w czacie „wklejam klucze Twilio”,
                    a otworzę bezpieczny formularz.
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                disabled={!user || smsTesting || !sms?.configured || !phone.trim()}
                onClick={async () => {
                  setSmsTesting(true);
                  setSmsError(null);
                  try {
                    const result = await sendSms({ data: { phone: phone.trim() } });
                    if (result.sent) toast.success(`Wysłaliśmy testowy SMS na ${result.to}`);
                    else {
                      toast.error(result.reason);
                      setSmsError({ reason: result.reason, diagnostics: result.diagnostics });
                    }
                  } catch (e) {
                    toast.error("Nie udało się wysłać SMS-a testowego");
                    setSmsError({
                      reason: e instanceof Error ? e.message : "Nieznany błąd połączenia",
                      diagnostics: null,
                    });
                  } finally {
                    setSmsTesting(false);
                  }
                }}
              >
                {smsTesting ? "Wysyłam…" : "Wyślij SMS testowy"}
              </Button>

              {smsError ? (
                <div className="space-y-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm">
                  <p className="font-medium text-destructive">Odpowiedź Twilio: {smsError.reason}</p>
                  {smsError.diagnostics ? (
                    <>
                      <ul className="space-y-0.5 text-xs text-muted-foreground">
                        <li>Status HTTP: {smsError.diagnostics.httpStatus}</li>
                        <li>Kod błędu Twilio: {smsError.diagnostics.providerCode ?? "brak"}</li>
                        <li>Do: {smsError.diagnostics.to}</li>
                        <li>Od: {smsError.diagnostics.from}</li>
                        {smsError.diagnostics.moreInfo ? (
                          <li className="break-all">
                            Dokumentacja: {smsError.diagnostics.moreInfo}
                          </li>
                        ) : null}
                      </ul>
                      <pre className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-[11px] whitespace-pre-wrap">
                        {smsError.diagnostics.rawBody}
                      </pre>
                    </>
                  ) : null}
                </div>
              ) : null}

            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <CalendarPlus className="size-3.5" />
                    Google Calendar
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {gcal?.connected
                      ? `Podłączony kalendarz: ${gcal.email ?? "kalendarz główny"}`
                      : "Podłącz swoje konto Google i wysyłaj terminy prosto do kalendarza."}
                  </p>
                </div>
              </div>

              {gcal && !gcal.clientConfigured ? (
                <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                  Integracja Google Calendar jest jeszcze konfigurowana po naszej stronie.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gcal?.connected ? (
                    <>
                      <Button
                        disabled={gcalBusy}
                        onClick={async () => {
                          setGcalBusy(true);
                          try {
                            const result = await syncGcal({ data: { items: items.slice(0, 300) } });
                            if (result.reason) toast.error(result.reason);
                            else
                              toast.success(
                                `Zapisano ${result.synced} terminów w Google Calendar${
                                  result.failed ? `, nie udało się ${result.failed}` : ""
                                }`,
                              );
                          } catch {
                            toast.error("Nie udało się zsynchronizować kalendarza");
                          } finally {
                            setGcalBusy(false);
                          }
                        }}
                      >
                        {gcalBusy ? "Synchronizuję…" : "Wyślij terminy do kalendarza"}
                      </Button>
                      <Button
                        variant="outline"
                        disabled={gcalBusy}
                        onClick={async () => {
                          setGcalBusy(true);
                          try {
                            await disconnectGcal();
                            setGcal(await gcalStatus());
                            toast.success("Kalendarz odłączony");
                          } catch {
                            toast.error("Nie udało się odłączyć kalendarza");
                          } finally {
                            setGcalBusy(false);
                          }
                        }}
                      >
                        Odłącz
                      </Button>
                    </>
                  ) : (
                    <Button
                      disabled={gcalBusy || !user}
                      onClick={async () => {
                        const popup = openConnectorPopup();
                        if (!popup) {
                          toast.error("Przeglądarka zablokowała okno — zezwól na wyskakujące okna");
                          return;
                        }
                        setGcalBusy(true);
                        try {
                          const { authorizationUrl } = await startGcal();
                          const done = waitForOAuthCompletion(popup, "google_calendar");
                          popup.location.href = authorizationUrl;
                          await done;
                          setGcal(await gcalStatus());
                          toast.success("Kalendarz Google podłączony");
                        } catch {
                          popup.close();
                          toast.error("Nie udało się podłączyć kalendarza");
                        } finally {
                          setGcalBusy(false);
                        }
                      }}
                    >
                      Podłącz Google Calendar
                    </Button>
                  )}
                </div>
              )}
              {!user ? (
                <p className="text-xs text-muted-foreground">
                  Zaloguj się, aby połączyć kalendarz ze swoim kontem.
                </p>
              ) : null}
            </div>


            <div className="space-y-2">
              <p className="text-sm font-medium">Eksport i import</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    downloadFile("deadline-terminy.csv", itemsToCSV(items), "text/csv");
                    toast.success("Pobrano plik CSV");
                  }}
                >
                  <FileDown className="size-4" />
                  Eksport CSV
                </Button>
                <Button variant="outline" onClick={() => fileInput.current?.click()}>
                  <FileUp className="size-4" />
                  Import CSV
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!openPDFReport(items))
                      toast.error("Przeglądarka zablokowała okno — zezwól na wyskakujące okna");
                  }}
                >
                  <FileDown className="size-4" />
                  Raport PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    downloadFile("deadline-terminy.ics", itemsToICS(items), "text/calendar");
                    toast.success("Pobrano plik .ics — zaimportuj go w Google Calendar");
                  }}
                >
                  <CalendarPlus className="size-4" />
                  Google Calendar (.ics)
                </Button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    const { items: parsed, skipped } = csvToItems(await file.text());
                    if (parsed.length === 0) {
                      toast.error("Nie znaleziono poprawnych wierszy w pliku");
                      return;
                    }
                    parsed.forEach(addItem);
                    toast.success(
                      `Zaimportowano ${parsed.length} pozycji${
                        skipped ? `, pominięto ${skipped}` : ""
                      }`,
                    );
                  } catch {
                    toast.error("Nie udało się odczytać pliku CSV");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Format CSV: nazwa; kategoria; data_waznosci (RRRR-MM-DD); przypomnienia_dni
                (np. 30|7|1); notatki.
              </p>
            </div>
          </div>
        )}
      </section>



      <section className="panel space-y-3 p-5">
        <h2 className="text-base font-semibold">Konto</h2>
        {user ? (
          <>
            <p className="text-sm text-muted-foreground">
              Zalogowano jako <span className="font-medium text-foreground">{user.email}</span>.
            </p>
            <Button variant="outline" onClick={handleSignOut}>
              Wyloguj się
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Utwórz konto, aby zapisać terminy i przypomnienia na stałe — e-mailem lub przez Google.
            </p>
            <Button asChild>
              <Link to="/auth">Utwórz konto / zaloguj się</Link>
            </Button>
          </>
        )}
      </section>

    </div>
  );
}
