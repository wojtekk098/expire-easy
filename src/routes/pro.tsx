import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { PRO_FEATURES, PRO_PRICE_PLN, usePro } from "@/lib/pro";

export const Route = createFileRoute("/pro")({
  head: () => ({
    meta: [
      { title: "Deadline Pro — 25 zł/mies. za spokój" },
      {
        name: "description",
        content:
          "Przypomnienia SMS, eksport i import CSV, raport PDF oraz terminy w Google Calendar. Deadline Pro za 25 zł miesięcznie.",
      },
      { property: "og:title", content: "Deadline Pro — 25 zł/mies." },
      {
        property: "og:description",
        content: "SMS-y, CSV, PDF i Google Calendar dla Twoich terminów.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProPage,
});

function ProPage() {
  const { pro, setPro } = usePro();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Deadline Pro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Wszystko, co potrzebne, aby żaden termin nie umknął — także wtedy, gdy nie zaglądasz do
          skrzynki.
        </p>
      </header>

      <section className="panel overflow-hidden p-0">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border bg-accent/40 p-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Plan Pro</p>
            <p className="mt-1 text-3xl font-semibold">
              {PRO_PRICE_PLN} zł
              <span className="ml-1 text-base font-normal text-muted-foreground">/ miesiąc</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Bez zobowiązań — rezygnujesz w dowolnym momencie.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
            <Sparkles className="size-3.5" />
            Pełny spokój
          </span>
        </div>

        <ul className="divide-y divide-border">
          {PRO_FEATURES.map((f) => (
            <li key={f.title} className="flex gap-3 p-5">
              <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-valid-soft text-valid">
                <Check className="size-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.description}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-3 border-t border-border p-6">
          {pro ? (
            <>
              <p className="text-sm font-medium text-valid">Dostęp Pro jest aktywny.</p>
              <p className="text-sm text-muted-foreground">
                Funkcje Pro znajdziesz w Ustawieniach — sekcja „Deadline Pro”.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/ustawienia">Przejdź do Ustawień</Link>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setPro(false);
                    toast.success("Dostęp Pro wyłączony");
                  }}
                >
                  Wyłącz dostęp Pro
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button
                onClick={() => {
                  setPro(true);
                  toast.success("Dostęp Pro włączony — funkcje są już dostępne w Ustawieniach");
                }}
              >
                Włącz dostęp Pro
              </Button>
              <p className="text-xs text-muted-foreground">
                Płatności kartą jeszcze nie są podłączone — na razie włączasz dostęp ręcznie, aby
                przetestować funkcje. Gdy powiesz „podłącz płatności”, dodam bezpieczny checkout z
                subskrypcją {PRO_PRICE_PLN} zł/mies.
              </p>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
