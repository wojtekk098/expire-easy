import { CalendarClock, BellRing, ShieldCheck } from "lucide-react";

/**
 * Statyczna treść marketingowa renderowana po stronie serwera dla "/".
 * Widoczna w początkowym HTML — dla botów SEO i podglądów linków.
 * Nie zawiera logiki uwierzytelniania.
 */
export function PublicLanding() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-3xl px-4 py-16">
        <p className="text-sm font-medium text-primary">Deadline</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground">
          Pilnuj terminów ważności w firmie
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Polisy, certyfikaty, umowy, domeny, licencje i przeglądy techniczne w jednym miejscu.
          Zobacz od razu, co wygasło, a co kończy się w najbliższych dniach — i dostań przypomnienie
          e-mailem lub SMS-em, zanim będzie za późno.
        </p>

        <div className="mt-8">
          <a
            href="/auth"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Zaloguj się lub utwórz konto
          </a>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-3">
          <li className="panel p-4">
            <CalendarClock className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Wszystkie terminy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Lista i kalendarz z jasnym statusem każdej pozycji.
            </p>
          </li>
          <li className="panel p-4">
            <BellRing className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Przypomnienia</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Powiadomienia e-mail i SMS ustawiane osobno dla każdego terminu.
            </p>
          </li>
          <li className="panel p-4">
            <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-3 text-sm font-semibold text-foreground">Spokój i porządek</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Eksport danych, import z Google Calendar i historia zmian.
            </p>
          </li>
        </ul>
      </main>
    </div>
  );
}
