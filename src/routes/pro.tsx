import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ExternalLink, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getPaddleEnvironment, getPaddlePriceId, initializePaddle } from "@/lib/paddle";
import { createPortalSession } from "@/lib/payments.functions";
import { PRO_FEATURES, PRO_PRICE_ID, PRO_PRICE_PLN, usePro } from "@/lib/pro";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/pro")({
  head: () =>
    pageHead({
      path: "/pro",
      title: "Deadline Pro — 25 zł/mies.",
      description:
        "Przypomnienia SMS, eksport i import CSV, raport PDF oraz import z Google Calendar. Deadline Pro za 25 zł miesięcznie.",
      ogTitle: "Deadline Pro — 25 zł/mies.",
      ogDescription: "SMS-y, CSV, PDF i Google Calendar dla Twoich terminów.",
      ogType: "product",
    }),
  component: ProPage,
});

function ProPage() {
  const { pro, subscription } = usePro();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const openPortal = useServerFn(createPortalSession);
  const testMode = getPaddleEnvironment() === "sandbox";

  async function handleSubscribe() {
    if (!user) return;
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(PRO_PRICE_ID);
      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: user.email ? { email: user.email } : undefined,
        customData: { userId: user.id },
        settings: {
          displayMode: "overlay",
          locale: "pl",
          successUrl: `${window.location.origin}/pro?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch {
      toast.error("Nie udało się otworzyć płatności. Spróbuj ponownie.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const result = await openPortal({ data: { environment: getPaddleEnvironment() } });
      if (result.url) window.open(result.url, "_blank", "noopener");
      else toast.error("Nie znaleźliśmy aktywnej subskrypcji");
    } catch {
      toast.error("Nie udało się otworzyć panelu subskrypcji");
    } finally {
      setPortalLoading(false);
    }
  }

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
              {subscription?.cancel_at_period_end ? (
                <p className="text-sm text-muted-foreground">
                  Subskrypcja zostanie zakończona na koniec bieżącego okresu — do tego czasu
                  korzystasz ze wszystkich funkcji.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Funkcje Pro znajdziesz w Ustawieniach — sekcja „Deadline Pro”.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link to="/ustawienia">Przejdź do Ustawień</Link>
                </Button>
                <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                  <ExternalLink className="size-4" />
                  {portalLoading ? "Otwieram…" : "Zarządzaj subskrypcją"}
                </Button>
              </div>
            </>
          ) : user ? (
            <>
              <div className="flex flex-wrap items-center gap-4">
                <Button onClick={handleSubscribe} disabled={loading}>
                  {loading ? "Otwieram płatność…" : `Wykup dostęp — ${PRO_PRICE_PLN} zł/mies.`}
                </Button>
                <PromoCodeForm onRedeemed={refresh} />
              </div>
              <p className="text-xs text-muted-foreground">
                Proces zamówienia obsługuje nasz sprzedawca internetowy Paddle.com — Paddle.com jest
                sprzedawcą (Merchant of Record) wszystkich zamówień, obsługuje zapytania obsługi
                klienta oraz zwroty, a faktura i VAT są rozliczane automatycznie. Anulujesz w każdej
                chwili. Obowiązuje <Link to="/regulamin">Regulamin</Link>,{" "}
                <Link to="/zwroty">30-dniowa gwarancja zwrotu</Link> i{" "}
                <Link to="/prywatnosc">Polityka prywatności</Link>.
                {testMode
                  ? " Podgląd działa w trybie testowym — użyj karty 4242 4242 4242 4242."
                  : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Zaloguj się, aby wykupić dostęp Pro — subskrypcja zostanie przypisana do Twojego
                konta.
              </p>
              <Button asChild>
                <Link to="/auth">Zaloguj się</Link>
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
