# Deadline Minder

Zbuduj aplikację webową "Deadline" — prosty tracker terminów ważności dla małych firm i jednoosobowych działalności gospodarczych (polisy, certyfikaty, umowy, domeny, licencje, przeglądy techniczne). Cel: użytkownik nigdy nie przegapia ważnego terminu.

KONTEKST PRODUKTU

To NIE jest system obiegu dokumentów dla korporacji (bez podpisów elektronicznych, bez wieloetapowej akceptacji). To radykalnie prosty produkt dla jednoosobowych firm i mikroprzedsiębiorstw: dodajesz pozycję z datą ważności, dostajesz przypomnienie zanim wygaśnie. Prostota jest kluczową przewagą konkurencyjną — konkurenci (systemy klasy enterprise) są zbyt skomplikowane dla tej grupy.

DESIGN SYSTEM

- Ton: czysty, spokojny, "biurowy" ale nowoczesny — to narzędzie do codziennego, szybkiego zerkania, nie ekscytujący produkt konsumencki

- Kolory: jasne tło (#FAFAF9), panele białe z delikatnym cieniem, akcent granatowo-zielony (#0F4C4C) jako kolor główny, ostrzeżenia w bursztynie (#D97706) dla terminów "wkrótce", czerwień (#DC2626) dla przeterminowanych, zieleń (#16A34A) dla "aktualne"

- Typografia: nagłówki "Inter" (semibold), tekst "Inter" (regular), bez fontów monospace — to nie jest terminal danych, to prosta lista

- Layout: prosty sidebar (Dashboard, Wszystkie pozycje, Kalendarz, Ustawienia) + główna treść jako lista/karty

STRUKTURA APLIKACJI

1. Dashboard: karty podsumowujące — "Przeterminowane" (czerwone), "W ciągu 7 dni" (bursztynowe), "W ciągu 30 dni" (żółte), "Aktualne" (zielone). Pod spodem lista najpilniejszych pozycji.

2. Widok "Wszystkie pozycje": tabela/lista z filtrowaniem po kategorii i statusie, sortowanie po dacie ważności

3. Formularz dodawania/edycji pozycji: nazwa, kategoria (użytkownik może tworzyć własne kategorie, ale zaproponuj domyślne: Ubezpieczenia, Certyfikaty, Umowy, Domeny/Hosting, Licencje oprogramowania, Przeglądy techniczne, Inne), data ważności, notatka opcjonalna, ile dni przed terminem wysłać przypomnienie (domyślnie 30/14/7/1 dzień, edytowalne)

4. Widok Kalendarz: miesięczny grid pokazujący pozycje wg daty ważności, kolorowane wg pilności

5. Ustawienia: kanał powiadomień (na start tylko email), zarządzanie kategoriami

DANE (mockowane na start)

Items: id, name, category, expiry_date, notes, reminder_days_before (tablica liczb), status (obliczany dynamicznie: przeterminowany/pilny/wkrótce/aktualny na podstawie expiry_date)

Logika statusu:

- Przeterminowany: expiry_date < dziś

- Pilny: expiry_date w ciągu 7 dni

- Wkrótce: expiry_date w ciągu 30 dni

- Aktualny: powyżej 30 dni

FUNKCJONALNOŚĆ MVP (zbuduj teraz)

- Pełne CRUD na pozycjach (dodaj/edytuj/usuń)

- Dashboard z dynamicznie liczonymi statusami

- Filtrowanie i sortowanie na liście

- Widok kalendarza z klikalnymi dniami pokazującymi pozycje danego dnia

- Możliwość tworzenia własnych kategorii przez użytkownika

- Puste stany (np. "Brak pozycji — dodaj pierwszy termin do śledzenia")

- Responsywność mobile — właściciele małych firm często sprawdzają to na telefonie

NA RAZIE NIE BUDUJ

- Wysyłki realnych powiadomień email/SMS — zostaw wyraźnie oznaczone miejsce w kodzie (komentarz) gdzie to wejdzie później przez Supabase Edge Function

- Logowania/rejestracji — jeden mockowany użytkownik na start

- Załączników/skanów dokumentów — faza 2

- Wielu użytkowników w ramach firmy — faza 2

TON I JĘZYK INTERFEJSU

Po polsku, prosty i konkretny język, zero żargonu korporacyjnego typu "workflow" czy "compliance" — to narzędzie dla właściciela małej firmy, nie dla działu IT dużej korporacji. Komunikaty przypomnień mają brzmieć jak przyjazne ostrzeżenie, nie biurokratyczny formularz — np. "Polisa OC wygasa za 7 dni" zamiast "Status dokumentu: bliski terminowi wygaśnięcia".

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://expire-easy.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/27e6cd91-8001-465b-ab27-b67ee05bc052).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
