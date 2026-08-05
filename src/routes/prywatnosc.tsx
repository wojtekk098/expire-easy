import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, Section } from "@/components/LegalPage";
import { SELLER } from "@/lib/legal";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/prywatnosc")({
  head: () =>
    pageHead({
      path: "/prywatnosc",
      title: "Polityka prywatności",
      description:
        "Jak Deadline przetwarza dane osobowe: zakres danych, cele, podstawy prawne, odbiorcy, retencja i Twoje prawa (RODO).",
      ogTitle: "Polityka prywatności",
      ogDescription: "Zakres danych, cele przetwarzania, odbiorcy i Twoje prawa zgodnie z RODO.",
    }),
  component: PrivacyRoute,
});

function PrivacyRoute() {
  return (
    <LegalPage
      title="Polityka prywatności"
      lead={`Jak ${SELLER.siteName} przetwarza dane osobowe użytkowników.`}
    >
      <Section heading="1. Administrator danych">
        <p>
          Administratorem Twoich danych osobowych jest <strong>{SELLER.legalName}</strong>,
          działający pod marką {SELLER.tradingName} ({SELLER.country}). Kontakt w sprawach danych:{" "}
          <a href={`mailto:${SELLER.contactEmail}`}>{SELLER.contactEmail}</a>. Decydujemy o celach i
          sposobach przetwarzania danych w aplikacji.
        </p>
      </Section>

      <Section heading="2. Jakie dane przetwarzamy i w jakim celu">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Dane konta</strong> (adres e-mail, nazwa, identyfikator z logowania Google, dane
            uwierzytelniające) — utworzenie i obsługa konta. Podstawa: wykonanie umowy.
          </li>
          <li>
            <strong>Treści, które wprowadzasz</strong> (nazwy terminów, daty, notatki, kategorie,
            dane kontaktowe: imię, e-mail, telefon) — świadczenie usługi, przypomnienia, kalendarz,
            eksporty. Podstawa: wykonanie umowy.
          </li>
          <li>
            <strong>Dane kontaktowe do przypomnień</strong> (e-mail, numer telefonu) — wysyłka
            powiadomień e-mail i SMS. Podstawa: wykonanie umowy; za dane osób trzecich, które
            wprowadzasz, odpowiadasz jako administrator tych danych.
          </li>
          <li>
            <strong>Dane techniczne</strong> (adres IP, identyfikator urządzenia i przeglądarki,
            logi, podstawowa telemetria użycia) — bezpieczeństwo, wykrywanie nadużyć, diagnostyka i
            rozwój produktu. Podstawa: prawnie uzasadniony interes.
          </li>
          <li>
            <strong>Korespondencja z pomocą</strong> — obsługa zgłoszeń. Podstawa: prawnie
            uzasadniony interes / wykonanie umowy.
          </li>
          <li>
            <strong>Dane rozliczeniowe</strong> — obsługa subskrypcji. Podstawa: wykonanie umowy i
            obowiązki prawne. Dane karty zbiera i przetwarza wyłącznie Paddle; my ich nie widzimy.
          </li>
        </ul>
      </Section>

      <Section heading="3. Komu udostępniamy dane">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Dostawcy infrastruktury i podprocesorzy</strong> — hosting aplikacji i bazy
            danych, uwierzytelnianie, dostawca wysyłki e-mail (Resend), dostawca wysyłki SMS
            (Twilio), narzędzia diagnostyczne.
          </li>
          <li>
            <strong>Sprzedawca (Merchant of Record) — Paddle.com</strong> — sprzedaż subskrypcji,
            obsługa płatności, zarządzanie subskrypcją, faktury i rozliczenia podatkowe.
          </li>
          <li>
            <strong>Doradcy zawodowi</strong> — obsługa prawna i księgowa, w niezbędnym zakresie.
          </li>
          <li>
            <strong>Organy publiczne</strong> — gdy wymagają tego przepisy prawa.
          </li>
        </ul>
        <p>Nie sprzedajemy danych osobowych.</p>
      </Section>

      <Section heading="4. Przekazywanie danych poza EOG">
        <p>
          Część dostawców może przetwarzać dane poza Europejskim Obszarem Gospodarczym. W takich
          przypadkach stosujemy zabezpieczenia wymagane przez RODO — standardowe klauzule umowne
          Komisji Europejskiej lub decyzje o odpowiednim stopniu ochrony.
        </p>
      </Section>

      <Section heading="5. Jak długo przechowujemy dane">
        <p>
          Dane konta i treści przechowujemy przez czas korzystania z usługi oraz do 30 dni po
          usunięciu konta (na wypadek przywrócenia), po czym są usuwane lub anonimizowane. Logi
          techniczne — do 12 miesięcy. Dokumentację rozliczeniową przechowujemy tak długo, jak
          wymagają tego przepisy podatkowe.
        </p>
      </Section>

      <Section heading="6. Twoje prawa">
        <p>
          Masz prawo do: dostępu do danych, sprostowania, usunięcia, ograniczenia przetwarzania,
          przenoszenia danych, sprzeciwu wobec przetwarzania opartego na prawnie uzasadnionym
          interesie oraz wycofania zgody w dowolnym momencie. Możesz też złożyć skargę do Prezesa
          Urzędu Ochrony Danych Osobowych. Wnioski realizujemy w ciągu miesiąca — wyślij je na{" "}
          <a href={`mailto:${SELLER.contactEmail}`}>{SELLER.contactEmail}</a>.
        </p>
      </Section>

      <Section heading="7. Bezpieczeństwo">
        <p>
          Stosujemy odpowiednie środki techniczne i organizacyjne: szyfrowanie transmisji (HTTPS),
          kontrolę dostępu na poziomie bazy danych (dostęp do danych wyłącznie dla ich właściciela),
          uwierzytelnianie kont i ograniczony dostęp administracyjny.
        </p>
      </Section>

      <Section heading="8. Pliki cookie i pamięć przeglądarki">
        <p>
          Używamy wyłącznie niezbędnych cookies i lokalnej pamięci przeglądarki: utrzymanie sesji
          logowania, zapamiętanie motywu (jasny/ciemny) oraz danych roboczych aplikacji. Nie
          stosujemy cookies marketingowych ani profilowania reklamowego. Pliki te możesz w każdej
          chwili usunąć w ustawieniach przeglądarki — spowoduje to wylogowanie. Strona checkoutu
          Paddle korzysta z własnych cookies niezbędnych do realizacji płatności.
        </p>
      </Section>
    </LegalPage>
  );
}
