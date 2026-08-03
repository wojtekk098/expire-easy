import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { SELLER } from "@/lib/legal";

export function LegalPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {lead ? <p className="mt-3 text-sm text-muted-foreground">{lead}</p> : null}
      <p className="mt-2 text-xs text-muted-foreground">
        Ostatnia aktualizacja: {SELLER.lastUpdated}
      </p>
      <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">{children}</div>
      <nav className="mt-12 flex flex-wrap gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link to="/regulamin" className="hover:text-foreground">
          Regulamin
        </Link>
        <Link to="/prywatnosc" className="hover:text-foreground">
          Polityka prywatności
        </Link>
        <Link to="/zwroty" className="hover:text-foreground">
          Zwroty i reklamacje
        </Link>
        <Link to="/pro" className="hover:text-foreground">
          Cennik
        </Link>
      </nav>
    </div>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">{heading}</h2>
      <div className="space-y-3 text-muted-foreground [&_a]:text-foreground [&_a]:underline">
        {children}
      </div>
    </section>
  );
}
