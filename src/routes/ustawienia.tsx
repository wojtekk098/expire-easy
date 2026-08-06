import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  CalendarPlus,
  FileDown,
  FileUp,
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
import { getSmsProviderStatus, sendTestSms } from "@/lib/sms.functions";
import {
  disconnectGoogleCalendar,
  getGoogleCalendarStatus,
  startGoogleCalendarConnect,
  importGoogleCalendarEvents,
} from "@/lib/gcal.functions";
import { openConnectorPopup, waitForOAuthCompletion } from "@/lib/connector-popup";
import {
  deletePushDevice,
  getPushPublicKey,
  getReminderSubscription,
  savePushDevice,
  saveReminderSubscription,
} from "@/lib/reminders.functions";
import {
  PUSH_SUPPORTED,
  currentPushEndpoint,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { PRO_PRICE_PLN, usePro } from "@/lib/pro";
import { pageHead } from "@/lib/seo";




export const Route = createFileRoute("/ustawienia")({
  head: () =>
    pageHead({
      path: "/ustawienia",
      title: "Ustawienia",
      description:
        "Ustaw adres e-mail i numer telefonu do przypomnień, zarządzaj kategoriami oraz integracjami.",
      ogTitle: "Ustawienia",
      ogDescription: "Powiadomienia e-mail, SMS i kategorie w aplikacji Deadline.",
      noindex: true,
    }),
  component: SettingsPage,
});

function SettingsPage() {
  const { categories, items, addItem, addCategory, deleteCategory } = useDeadlines();
  const { pro } = usePro();
  const [phone, setPhone] = useState("");
  const [smsOn, setSmsOn] = useState(false);
  const [smsTesting, setSmsTesting] = useState(false);
  const [smsError, setSmsError] = useState<{
    reason: string;
    diagnostics: {
      httpStatus: number;
      providerCode: number | null;
      providerMessage: string | null;
      moreInfo: string | null;
      to: string;
      from: string;
      rawBody: string;
    } | null;
  } | null>(null);
  const [smsTrialInfo, setSmsTrialInfo] = useState<string | null>(null);
  const [sms, setSms] = useState<{
    configured: boolean;
    from: string | null;
    missing: string[];
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
  const save = useServerFn(saveReminderSubscription);
  const load = useServerFn(getReminderSubscription);

  const smsStatus = useServerFn(getSmsProviderStatus);
  const sendSms = useServerFn(sendTestSms);
  const gcalStatus = useServerFn(getGoogleCalendarStatus);
  const startGcal = useServerFn(startGoogleCalendarConnect);
  const importGcal = useServerFn(importGoogleCalendarEvents);
  const disconnectGcal = useServerFn(disconnectGoogleCalendar);
  const pushKey = useServerFn(getPushPublicKey);
  const savePush = useServerFn(savePushDevice);
  const removePush = useServerFn(deletePushDevice);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
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


  useEffect(() => {
    if (!PUSH_SUPPORTED) return;
    currentPushEndpoint()
      .then((endpoint) => setPushOn(Boolean(endpoint)))
      .catch(() => undefined);
  }, []);

  async function handlePushToggle(next: boolean) {
    const token = localStorage.getItem(REMINDER_TOKEN_KEY);
    if (next && !token) {
      toast.error("Najpierw zapisz przypomnienia e-mail — potrzebujemy ich do powiązania urządzenia.");
      return;
    }
    setPushBusy(true);
    try {
      if (next) {
        const { publicKey } = await pushKey();
        const device = await subscribeToPush(publicKey);
        if (!device) {
          toast.error("Nie udało się włączyć powiadomień — sprawdź zgodę w ustawieniach telefonu.");
          return;
        }
        const result = await savePush({ data: { token: token!, ...device } });
        if (!result.saved) {
          toast.error("Nie znaleźliśmy Twoich przypomnień. Zapisz je ponownie i spróbuj jeszcze raz.");
          return;
        }
        setPushOn(true);
        toast.success("Powiadomienia w aplikacji włączone na tym urządzeniu");
      } else {
        const endpoint = await unsubscribeFromPush();
        if (endpoint) await removePush({ data: { endpoint } });
        setPushOn(false);
        toast.success("Powiadomienia w aplikacji wyłączone na tym urządzeniu");
      }
    } catch {
      toast.error("Nie udało się zmienić ustawień powiadomień");
    } finally {
      setPushBusy(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const token = localStorage.getItem(REMINDER_TOKEN_KEY);
      const result = await save({
        data: {
          ...(token ? { token } : {}),
          enabled: emailOn,
          phone: phone.trim(),
          smsEnabled: smsOn,
          items,
          origin: window.location.origin,
        },
      });
      localStorage.setItem(REMINDER_TOKEN_KEY, result.token);
      if (!result.confirmed) {
        toast.success(
          "Zapisano — wysłaliśmy link potwierdzający na adres Twojego konta. Przypomnienia ruszą po jego kliknięciu.",
        );
      } else {
        toast.success(
          emailOn
            ? "Zapisano — przypomnienia będą wysyłane na adres Twojego konta"
            : "Zapisano — przypomnienia e-mail są wyłączone",
        );
      }
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

        <div className="rounded-lg bg-muted px-3 py-2 text-sm">
          <span className="text-muted-foreground">Adres wysyłki: </span>
          <span className="font-medium text-foreground">{user?.email ?? "—"}</span>
          <p className="mt-1 text-xs text-muted-foreground">
            Przypomnienia wysyłamy na adres e-mail, na który założone jest Twoje konto.
          </p>
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
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
            <Smartphone className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Powiadomienia w aplikacji</h2>
            <p className="text-sm text-muted-foreground">
              Po dodaniu aplikacji do ekranu głównego telefonu wyślemy powiadomienie systemowe
              o godzinie ustawionej w danym terminie — nawet gdy aplikacja jest zamknięta.
            </p>
          </div>
          <Switch
            checked={pushOn}
            disabled={!PUSH_SUPPORTED || pushBusy}
            onCheckedChange={(v) => void handlePushToggle(v)}
            aria-label="Włącz powiadomienia w aplikacji"
          />
        </div>
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          {PUSH_SUPPORTED
            ? "Ustawienie dotyczy tego urządzenia. Na iPhonie najpierw dodaj aplikację do ekranu głównego."
            : "Ta przeglądarka nie obsługuje powiadomień systemowych. Otwórz aplikację na telefonie i dodaj ją do ekranu głównego."}
        </p>
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
                    Bramka Twilio podłączona, nadawca:{" "}
                    <span className="font-medium">{sms.from}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    Bramka Twilio nie jest jeszcze gotowa — napisz w czacie „wklejam klucze Twilio”,
                    a otworzę bezpieczny formularz.
                    {sms.missing.length > 0 ? (
                      <span className="block mt-1 text-xs">
                        Brakujące zmienne: {sms.missing.join(", ")}
                      </span>
                    ) : null}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                disabled={!user || smsTesting || !sms?.configured || !phone.trim()}
                onClick={async () => {
                  setSmsTesting(true);
                  setSmsError(null);
                  setSmsTrialInfo(null);
                  try {
                    const result = await sendSms({ data: { phone: phone.trim() } });
                    if (result.sent) {
                      if ("usedTrialTemplate" in result && result.usedTrialTemplate) {
                        setSmsTrialInfo(
                          "SMS testowy wysłany, ale konto Twilio jest w trybie trial — użyto predefiniowanego szablonu „sms_appointment_reminders”. Aby wysyłać własne treści, doładuj konto Twilio.",
                        );
                        toast.success("Wysłaliśmy testowy SMS (tryb trial Twilio)");
                      } else {
                        toast.success(`Wysłaliśmy testowy SMS na ${result.to}`);
                      }
                    } else {
                      toast.error(result.reason);
                      setSmsError({
                        reason: result.reason,
                        diagnostics: result.diagnostics ?? null,
                      });
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

              {smsTrialInfo ? (
                <div className="space-y-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <p className="font-medium text-amber-700 dark:text-amber-300">
                    Tryb trial Twilio
                  </p>
                  <p className="text-xs text-amber-700/80 dark:text-amber-300/80">
                    {smsTrialInfo}
                  </p>
                </div>
              ) : null}

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
                        {smsError.diagnostics.providerCode === 572006 ? (
                          <li>
                            Konto Twilio jest w trybie trial. W trybie trial można wysyłać SMS-y
                            tylko z predefiniowanych szablonów (np. „sms_appointment_reminders”).
                            Aby używać własnych treści, doładuj konto Twilio.
                          </li>
                        ) : null}
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
                      : "Podłącz swoje konto Google i importuj wydarzenia z kalendarza jako terminy."}
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
                            const result = await importGcal();
                            if (result.reason) {
                              toast.error(result.reason);
                              return;
                            }
                            const known = new Set(
                              items.map((i) => `${i.expiry_date}|${i.name.toLowerCase()}`),
                            );
                            let added = 0;
                            for (const event of result.events) {
                              const key = `${event.expiry_date}|${event.name.toLowerCase()}`;
                              if (known.has(key)) continue;
                              known.add(key);
                              addItem({
                                name: event.name,
                                category: "Inne",
                                expiry_date: event.expiry_date,
                                notes: event.notes ?? "",
                                reminder_days_before: [7, 1],
                                start_time: event.start_time,
                                end_time: event.end_time,
                              });
                              added += 1;
                            }
                            toast.success(
                              added
                                ? `Zaimportowano ${added} terminów z Google Calendar`
                                : "Brak nowych wydarzeń do zaimportowania",
                            );
                          } catch {
                            toast.error("Nie udało się zaimportować kalendarza");
                          } finally {
                            setGcalBusy(false);
                          }
                        }}
                      >
                        {gcalBusy ? "Importuję…" : "Importuj terminy z kalendarza"}
                      </Button>

                      <Button
                        variant="outline"
                        disabled={gcalBusy || !user}
                        onClick={async () => {
                          const popup = openConnectorPopup();
                          if (!popup) {
                            toast.error("Przeglądarka zablokowała okno — zezwól na wyskakujące okna");
                            return;
                          }
                          setGcalBusy(true);
                          try {
                            await disconnectGcal();
                            const { authorizationUrl } = await startGcal();
                            const done = waitForOAuthCompletion(popup, "google_calendar");
                            popup.location.href = authorizationUrl;
                            await done;
                            setGcal(await gcalStatus());
                            toast.success("Konto Google zmienione");
                          } catch {
                            popup.close();
                            setGcal(await gcalStatus().catch(() => gcal));
                            toast.error("Nie udało się zmienić konta Google");
                          } finally {
                            setGcalBusy(false);
                          }
                        }}
                      >
                        Zmień konto Google
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
