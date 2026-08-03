import { getPaddleEnvironment } from "@/lib/paddle";

/** Pasek informujący, że płatności w podglądzie są testowe. */
export function PaymentTestModeBanner() {
  if (getPaddleEnvironment() !== "sandbox") return null;

  return (
    <div className="w-full border-b border-border bg-soon-soft px-4 py-2 text-center text-xs text-soon">
      Płatności w podglądzie działają w trybie testowym — nie pobieramy prawdziwych pieniędzy.
    </div>
  );
}
