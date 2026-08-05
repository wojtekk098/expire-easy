import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/LegalPage";
import { SELLER, PADDLE_MOR_PL } from "@/lib/legal";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/regulamin")({
  head: () =>
    pageHead({
      path: "/regulamin",
      title: "Regulamin",
      description:
        "Regulamin korzystania z aplikacji Deadline: zasady użytkowania, płatności, subskrypcja Pro i warunki rozwiązania umowy.",
      ogTitle: "Regulamin",
      ogDescription: "Zasady korzystania z aplikacji Deadline oraz warunki subskrypcji Pro.",
    }),
  component: TermsRoute,
});

function TermsRoute() {
  return (
    <LegalPage
      title="Regulamin"
      lead={`Regulamin korzystania z aplikacji ${SELLER.siteName} dostępnej pod adresem ${SELLER.domain}.`}
    >
      <Section heading="1. Kto świadczy usługę">
        <p>
          Usługę świadczy <strong>{SELLER.legalName}</strong> (dalej „my”, „Usługodawca”),
          działający pod marką {SELLER.tradingName}, z siedzibą w {SELLER.country}. Kontakt:{" "}
          <a href={`mailto:${SELLER.contactEmail}`}>{SELLER.contactEmail}</a>. Umowa o korzystanie z
          aplikacji zawierana jest pomiędzy Tobą a Usługodawcą.
        </p>
      </Section>

      <Section heading="2. Akceptacja regulaminu">
        <p>
          Zakładając konto lub dalej korzystając z aplikacji, akceptujesz niniejszy regulamin.
          Jeśli korzystasz z aplikacji w imieniu firmy, oświadczasz, że masz uprawnienia do
          zawarcia umowy w jej imieniu. Osoby fizyczne muszą być pełnoletnie.
        </p>
      </Section>

      <Section heading="3. Czym jest Deadline">
        <p>
          Deadline to aplikacja internetowa do pilnowania terminów ważności (polisy, certyfikaty,
          umowy, domeny, licencje, przeglądy) wraz z kalendarzem, przypomnieniami e-mail oraz —
          w planie Pro — przypomnieniami SMS, eksportem/importem CSV, raportami PDF i eksportem do
          kalendarza.
        </p>
        <p>
          Aplikacja jest narzędziem pomocniczym. Nie zwalnia Cię z samodzielnej kontroli własnych
          terminów i obowiązków prawnych.
        </p>
      </Section>

      <Section heading="4. Konto i dane">
        <p>
          Odpowiadasz za poufność danych logowania oraz za działania podejmowane na Twoim koncie.
          Podane dane powinny być prawdziwe i aktualne.
        </p>
      </Section>

      <Section heading="5. Niedozwolone korzystanie">
        <p>Nie wolno w szczególności:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>korzystać z aplikacji w sposób sprzeczny z prawem,</li>
          <li>dokonywać oszustw, wysyłać spamu ani niezamówionych wiadomości przez nasze przypomnienia,</li>
          <li>naruszać praw własności intelektualnej osób trzecich,</li>
          <li>
            zakłócać bezpieczeństwa usługi: wprowadzać złośliwego oprogramowania, skanować
            infrastrukturę, scrapować dane, obchodzić limity techniczne,
          </li>
          <li>odsprzedawać, redystrybuować ani dokonywać inżynierii wstecznej aplikacji.</li>
        </ul>
        <p>
          Wgrywając numery telefonów i adresy e-mail osób trzecich do przypomnień, oświadczasz, że
          masz podstawę prawną do ich przetwarzania i kontaktu.
        </p>
      </Section>

      <Section heading="6. Własność intelektualna">
        <p>
          Aplikacja, jej kod, interfejs, dokumentacja i oznaczenia stanowią naszą własność.
          Otrzymujesz ograniczone, niewyłączne i nieprzenoszalne prawo do korzystania z aplikacji
          w zakresie wybranego planu. Dane, które wprowadzasz, pozostają Twoje — udzielasz nam
          jedynie licencji na ich przechowywanie i przetwarzanie w celu świadczenia usługi.
        </p>
      </Section>

      <Section heading="7. Dostępność usługi">
        <p>
          Dbamy o wysoką dostępność, ale nie gwarantujemy nieprzerwanej ani bezbłędnej pracy
          aplikacji. Mogą wystąpić przerwy techniczne, konserwacje i zdarzenia poza naszą kontrolą.
          W maksymalnym zakresie dopuszczalnym prawem wyłączamy dorozumiane gwarancje przydatności
          do określonego celu.
        </p>
      </Section>

      <Section heading="8. Płatności i subskrypcja">
        <p>
          Plan Pro kosztuje 25 zł miesięcznie i odnawia się automatycznie do momentu rezygnacji.
          Rezygnacja jest możliwa w każdej chwili — dostęp trwa do końca opłaconego okresu.
        </p>
        <p>
          Zasady płatności, rozliczeń, podatków, faktur, anulowania i zwrotów reguluje regulamin
          zakupowy naszego sprzedawcy:{" "}
          <a
            href="https://www.paddle.com/legal/checkout-buyer-terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Paddle Checkout Buyer Terms
          </a>
          . Zobacz też naszą stronę{" "}
          <a href="/zwroty">Zwroty i reklamacje</a>.
        </p>
        <p>{PADDLE_MOR_PL}</p>
      </Section>

      <Section heading="9. Zawieszenie i rozwiązanie">
        <p>
          Możemy zawiesić lub zamknąć dostęp do konta w przypadku: istotnego naruszenia regulaminu,
          braku płatności, ryzyka bezpieczeństwa lub oszustwa, a także powtarzających się bądź
          poważnych naruszeń zasad korzystania. Ty możesz usunąć konto w każdej chwili.
        </p>
        <p>
          Po zakończeniu korzystania masz 30 dni na wyeksportowanie danych; następnie dane zostają
          usunięte lub zanonimizowane.
        </p>
      </Section>

      <Section heading="10. Odpowiedzialność">
        <p>
          Nasza całkowita odpowiedzialność ograniczona jest do kwoty opłat zapłaconych przez Ciebie
          w okresie 12 miesięcy poprzedzających zdarzenie. Nie odpowiadamy za szkody pośrednie,
          następcze, utracone korzyści, utratę danych lub reputacji, w tym za skutki przeoczenia
          terminu. Nie wyłączamy odpowiedzialności za oszustwo, śmierć lub uszkodzenie ciała ani
          innej odpowiedzialności, której nie można wyłączyć zgodnie z prawem.
        </p>
      </Section>

      <Section heading="11. Zmiany, prawo i spory">
        <p>
          Możemy aktualizować regulamin; o istotnych zmianach poinformujemy e-mailem lub w
          aplikacji. Umowa podlega prawu polskiemu, a spory rozstrzygają sądy właściwe dla siedziby
          Usługodawcy, z zachowaniem praw konsumentów. Nie możesz przenieść umowy bez naszej zgody;
          my możemy ją przenieść w ramach połączenia lub przejęcia.
        </p>
      </Section>
    </LegalPage>
  );
}
