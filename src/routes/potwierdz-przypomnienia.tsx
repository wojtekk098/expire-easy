import { useEffect, useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { confirmReminderSubscription } from "@/lib/reminders.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/potwierdz-przypomnienia")({
  validateSearch: z.object({ token: z.string().optional() }),
  head: () =>
    pageHead({
      path: "/potwierdz-przypomnienia",
      title: "Potwierdź przypomnienia",
      description:
        "Potwierdź swój adres e-mail, aby zacząć otrzymywać przypomnienia o terminach z aplikacji Deadline.",
      ogTitle: "Potwierdź przypomnienia",
      ogDescription: "Jedno kliknięcie i przypomnienia o terminach trafią na Twój adres e-mail.",
      noindex: true,
    }),
  component: ConfirmPage,
});

function ConfirmPage() {
  const { token } = useSearch({ from: "/potwierdz-przypomnienia" });
  const [state, setState] = useState<"pending" | "ok" | "fail">("pending");

  useEffect(() => {
    if (!token) {
      setState("fail");
      return;
    }
    confirmReminderSubscription({ data: { confirmToken: token } })
      .then((r) => setState(r.confirmed ? "ok" : "fail"))
      .catch(() => setState("fail"));
  }, [token]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="panel max-w-md space-y-3 p-6 text-center">
        {state === "pending" && <p className="text-sm text-muted-foreground">Sprawdzamy link…</p>}
        {state === "ok" && (
          <>
            <h1 className="text-xl font-semibold">Adres potwierdzony</h1>
            <p className="text-sm text-muted-foreground">
              Od teraz będziemy wysyłać przypomnienia o Twoich terminach na ten adres.
            </p>
          </>
        )}
        {state === "fail" && (
          <>
            <h1 className="text-xl font-semibold">Link jest nieprawidłowy</h1>
            <p className="text-sm text-muted-foreground">
              Link wygasł albo został już użyty. Zapisz adres ponownie w Ustawieniach, aby dostać
              nową wiadomość.
            </p>
          </>
        )}
        <Link to="/" className="inline-block text-sm text-primary hover:underline">
          Wróć do aplikacji
        </Link>
      </div>
    </div>
  );
}
