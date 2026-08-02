import { useEffect, useState } from "react";

const PRO_KEY = "deadline.pro";
const EVENT = "deadline:pro-changed";

export const PRO_PRICE_PLN = 25;

export const PRO_FEATURES = [
  {
    title: "Przypomnienia SMS",
    description: "Ten sam terminarz, ale wiadomość ląduje w telefonie — nawet bez dostępu do maila.",
  },
  {
    title: "Eksport i import CSV",
    description: "Przenieś terminy z Excela w jednej chwili i miej kopię wszystkiego u siebie.",
  },
  {
    title: "Raport PDF",
    description: "Czytelne zestawienie terminów do wydruku, dla biura rachunkowego albo audytu.",
  },
  {
    title: "Google Calendar",
    description: "Terminy jako wydarzenia w Twoim kalendarzu — plik .ics dodasz jednym kliknięciem.",
  },
] as const;

export function isProActive(): boolean {
  try {
    return localStorage.getItem(PRO_KEY) === "active";
  } catch {
    return false;
  }
}

export function setProActive(active: boolean) {
  try {
    if (active) localStorage.setItem(PRO_KEY, "active");
    else localStorage.removeItem(PRO_KEY);
  } catch {
    /* brak dostępu do localStorage */
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Czy użytkownik ma aktywny dostęp Pro. `ready` mówi, czy odczyt już nastąpił. */
export function usePro(): { pro: boolean; ready: boolean; setPro: (active: boolean) => void } {
  const [pro, setPro] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const read = () => setPro(isProActive());
    read();
    setReady(true);
    window.addEventListener(EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener(EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);

  return { pro, ready, setPro: setProActive };
}
