import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/LegalPage";
import { SELLER } from "@/lib/legal";

export const Route = createFileRoute("/zwroty")({
  head: () => ({
    meta: [
      { title: "Zwroty i reklamacje — Deadline" },
      {
        name: "description",
        content:
          "30-dniowa gwarancja zwrotu pieniędzy dla subskrypcji Deadline Pro oraz sposób złożenia wniosku o zwrot.",
      },
      { property: "og:title", content: "Zwroty i reklamacje — Deadline" },
      {
        property: "og:description",
        content: "30-dniowa gwarancja zwrotu pieniędzy dla subskrypcji Deadline Pro.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RefundRoute,
});

function RefundRoute() {
  return (
    <LegalPage
      title="Zwroty i reklamacje"
      lead={`Polityka zwrotów dla subskrypcji ${SELLER.siteName} Pro.`}
    >
      <Section heading={`${SELLER.refundDays}-dniowa gwarancja zwrotu pieniędzy`}>
        <p>
          Jeśli plan Pro Ci nie odpowiada, możesz poprosić o pełny zwrot w ciągu{" "}
          {SELLER.refundDays} dni od daty zamówienia — bez podawania przyczyny.
        </p>
      </Section>

      <Section heading="Jak poprosić o zwrot">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Napisz do nas na <a href={`mailto:${SELLER.contactEmail}`}>{SELLER.contactEmail}</a> —
            odpowiadamy zwykle w ciągu 2 dni roboczych.
          </li>
          <li>
            Albo skontaktuj się bezpośrednio z obsługą płatności na{" "}
            <a href="https://paddle.net" target="_blank" rel="noopener noreferrer">
              paddle.net
            </a>{" "}
            (wystarczy e-mail użyty przy zakupie lub numer zamówienia).
          </li>
        </ul>
        <p>
          Zwroty realizuje nasz sprzedawca (Merchant of Record) Paddle.com, na tę samą metodę
          płatności. Środki wracają zwykle w ciągu 3–10 dni roboczych, zależnie od banku.
        </p>
      </Section>

      <Section heading="Anulowanie subskrypcji">
        <p>
          Subskrypcję możesz anulować w każdej chwili w Ustawieniach lub przez panel klienta Paddle.
          Po anulowaniu dostęp do funkcji Pro trwa do końca opłaconego okresu, a kolejne płatności
          nie są pobierane.
        </p>
      </Section>

      <Section heading="Reklamacje">
        <p>
          Reklamacje dotyczące działania aplikacji zgłaszaj na{" "}
          <a href={`mailto:${SELLER.contactEmail}`}>{SELLER.contactEmail}</a>. Rozpatrujemy je w
          ciągu 14 dni. Szczegółowe zasady zwrotów opisuje również{" "}
          <a href="https://www.paddle.com/legal/refund-policy" target="_blank" rel="noopener noreferrer">
            polityka zwrotów Paddle
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
