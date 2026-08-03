/**
 * OCR dokumentów w przeglądarce (tesseract.js).
 *
 * Uwaga: moduł jest ciężki (WASM + dane językowe), więc importujemy go
 * dynamicznie dopiero w chwili skanowania i nigdy na serwerze.
 */

import { toISO } from "./deadline-types";

const MONTHS_PL: Record<string, number> = {
  stycznia: 1,
  styczen: 1,
  styczeń: 1,
  lutego: 2,
  luty: 2,
  marca: 3,
  marzec: 3,
  kwietnia: 4,
  kwiecien: 4,
  kwiecień: 4,
  maja: 5,
  maj: 5,
  czerwca: 6,
  czerwiec: 6,
  lipca: 7,
  lipiec: 7,
  sierpnia: 8,
  sierpien: 8,
  sierpień: 8,
  wrzesnia: 9,
  września: 9,
  wrzesien: 9,
  wrzesień: 9,
  pazdziernika: 10,
  października: 10,
  pazdziernik: 10,
  październik: 10,
  listopada: 11,
  listopad: 11,
  grudnia: 12,
  grudzien: 12,
  grudzień: 12,
};

/** Słowa, po których w polskich dokumentach zwykle stoi data końca ważności. */
const EXPIRY_HINTS = [
  "ważn",
  "wazn",
  "do dnia",
  "wygasa",
  "wygaśnie",
  "termin",
  "obowiązuje do",
  "obowiazuje do",
  "koniec",
  "expiry",
  "valid until",
];

export type OcrCandidate = {
  iso: string;
  score: number;
};

export type OcrResult = {
  text: string;
  /** Najlepsza propozycja daty ważności (YYYY-MM-DD) albo null. */
  expiryDate: string | null;
  /** Wszystkie znalezione daty, od najbardziej prawdopodobnej. */
  dates: string[];
  /** Propozycja nazwy pozycji z nagłówka dokumentu. */
  suggestedName: string | null;
  /** Numer dokumentu/polisy, jeśli udało się go rozpoznać. */
  documentNumber: string | null;
};

function safeISO(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const y = year < 100 ? 2000 + year : year;
  if (y < 1990 || y > 2100) return null;
  const date = new Date(y, month - 1, day);
  if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return toISO(date);
}

/** Wyciąga wszystkie daty z tekstu wraz z pozycją, na której wystąpiły. */
function findDates(text: string): { iso: string; index: number }[] {
  const found: { iso: string; index: number }[] = [];

  const numeric = /\b(\d{1,4})[.\-/\s](\d{1,2})[.\-/\s](\d{2,4})\b/g;
  for (const match of text.matchAll(numeric)) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const c = Number(match[3]);
    const iso = match[1]!.length === 4 ? safeISO(a, b, c) : safeISO(c, b, a);
    if (iso) found.push({ iso, index: match.index ?? 0 });
  }

  const worded = new RegExp(`\\b(\\d{1,2})\\s+([a-ząćęłńóśźż]+)\\s+(\\d{4})\\b`, "gi");
  for (const match of text.matchAll(worded)) {
    const month = MONTHS_PL[(match[2] ?? "").toLowerCase()];
    if (!month) continue;
    const iso = safeISO(Number(match[3]), month, Number(match[1]));
    if (iso) found.push({ iso, index: match.index ?? 0 });
  }

  return found;
}

/** Ocenia, która z dat najpewniej jest datą ważności. */
function rankDates(text: string): string[] {
  const lower = text.toLowerCase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const scored = new Map<string, number>();
  for (const { iso, index } of findDates(text)) {
    let score = 0;
    const window = lower.slice(Math.max(0, index - 60), index);
    if (EXPIRY_HINTS.some((hint) => window.includes(hint))) score += 100;
    const time = new Date(`${iso}T00:00:00`).getTime();
    if (time >= today.getTime()) score += 40;
    // Daty odległe w przyszłości są bardziej „końcem ważności” niż datą wystawienia.
    score += Math.min(30, Math.max(0, (time - today.getTime()) / 86_400_000 / 30));
    scored.set(iso, Math.max(scored.get(iso) ?? 0, score));
  }

  return [...scored.entries()].sort((a, b) => b[1] - a[1]).map(([iso]) => iso);
}

function guessName(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 4 && l.length <= 80 && /[a-ząćęłńóśźż]/i.test(l));
  if (lines.length === 0) return null;
  const keyword = lines.find((l) =>
    /polisa|ubezpieczen|certyfikat|umowa|licencj|przegląd|przeglad|zaświadczen|zaswiadczen|badanie|faktura|domena/i.test(
      l,
    ),
  );
  return (keyword ?? lines[0])!.slice(0, 80);
}

function guessDocumentNumber(text: string): string | null {
  const match = text.match(
    /(?:nr|numer|no\.?|seria i numer)[^\dA-Z]{0,10}([A-Z0-9][A-Z0-9./-]{4,24})/i,
  );
  return match?.[1] ?? null;
}

export function analyzeOcrText(text: string): OcrResult {
  const dates = rankDates(text);
  return {
    text,
    expiryDate: dates[0] ?? null,
    dates,
    suggestedName: guessName(text),
    documentNumber: guessDocumentNumber(text),
  };
}

/** Rozpoznaje tekst na zdjęciu dokumentu i proponuje dane terminu. */
export async function scanDocumentImage(
  file: File | Blob,
  onProgress?: (progress: number) => void,
): Promise<OcrResult> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("pol+eng", 1, {
    logger: (message: { status: string; progress: number }) => {
      if (message.status === "recognizing text") onProgress?.(message.progress);
    },
  });
  try {
    const { data } = await worker.recognize(file);
    return analyzeOcrText(data.text ?? "");
  } finally {
    await worker.terminate();
  }
}
