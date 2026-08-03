import { useRef, useState } from "react";
import { Loader2, ScanLine } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { formatPL } from "@/lib/deadline-types";
import type { OcrResult } from "@/lib/ocr";

/**
 * Skan dokumentu (zdjęcie polisy, certyfikatu, faktury) — OCR w przeglądarce
 * proponuje datę ważności, nazwę i numer dokumentu.
 */
export function DocumentScanner({
  onResult,
}: {
  onResult: (result: OcrResult) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleFile(file: File) {
    setBusy(true);
    setProgress(0);
    setSummary(null);
    try {
      const { scanDocumentImage } = await import("@/lib/ocr");
      const result = await scanDocumentImage(file, (p) => setProgress(p));
      if (!result.text.trim()) {
        toast.error("Nie udało się odczytać tekstu — spróbuj wyraźniejszego zdjęcia");
        return;
      }
      onResult(result);
      setSummary(
        result.expiryDate
          ? `Znaleziono datę: ${formatPL(result.expiryDate)}`
          : "Odczytano tekst, ale nie znaleźliśmy daty — wpisz ją ręcznie",
      );
      toast.success("Dokument odczytany — sprawdź uzupełnione pola");
    } catch (error) {
      console.error(error);
      toast.error("Skanowanie nie udało się. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/40 p-3">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
          <ScanLine className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Zeskanuj dokument</p>
          <p className="text-xs text-muted-foreground">
            Zrób zdjęcie polisy albo certyfikatu — odczytamy datę ważności i numer.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={busy}
          onClick={() => input.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
          {busy ? `${Math.round(progress * 100)}%` : "Wybierz zdjęcie"}
        </Button>
      </div>

      {summary ? <p className="text-xs text-muted-foreground">{summary}</p> : null}

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void handleFile(file);
        }}
      />
    </div>
  );
}
