import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useDeadlines } from "@/lib/deadline-store";

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
  const { categories, items, addCategory, deleteCategory } = useDeadlines();
  const [email, setEmail] = useState("anna@mojafirma.pl");
  const [emailOn, setEmailOn] = useState(true);
  const [newCategory, setNewCategory] = useState("");

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
              Wyślemy krótką wiadomość, np. „Polisa OC wygasa za 7 dni”.
            </p>
          </div>
          <Switch checked={emailOn} onCheckedChange={setEmailOn} aria-label="Włącz e-maile" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Adres e-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!emailOn}
          />
        </div>

        {/*
          TODO (integracja powiadomień):
          Tutaj wejdzie zapis ustawień oraz wysyłka przypomnień przez
          Supabase Edge Function (np. `send-reminders`), uruchamianą codziennie
          przez pg_cron. Funkcja policzy dla każdej pozycji dni do expiry_date,
          dopasuje je do reminder_days_before i wyśle e-mail (Resend).
          Na tym etapie nie wysyłamy żadnych realnych wiadomości.
        */}
        <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
          Wysyłka e-maili jest jeszcze wyłączona — przygotowujemy ją. SMS i inne kanały dodamy
          później.
        </p>
        <Button onClick={() => toast.success("Ustawienia zapisane")}>Zapisz ustawienia</Button>
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

      <section className="panel p-5">
        <h2 className="text-base font-semibold">Konto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Anna Kowalska · anna@mojafirma.pl — na razie jedno konto testowe. Logowanie i praca
          zespołowa pojawią się później.
        </p>
      </section>
    </div>
  );
}
