import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Ticket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { redeemPromoCode } from "@/lib/promo.functions";

/** Zwinięte pole kodu promocyjnego — osobna ścieżka nadawania dostępu Pro. */
export function PromoCodeForm({ onRedeemed }: { onRedeemed?: () => void }) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const redeem = useServerFn(redeemPromoCode);

  async function handleRedeem() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await redeem({ data: { code } });
      if (result.ok) {
        const date = new Date(result.proUntil).toLocaleDateString("pl-PL");
        toast.success(`Aktywowano! Masz dostęp Pro do ${date}`);
        setCode("");
        setOpen(false);
        onRedeemed?.();
      } else if (result.error === "already") {
        toast.error("Ten kod został już przez Ciebie wykorzystany");
      } else if (result.error === "limit") {
        toast.error("Ten kod osiągnął limit użyć");
      } else {
        toast.error("Nieprawidłowy lub wygasły kod");
      }
    } catch {
      toast.error("Nieprawidłowy lub wygasły kod");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        <Ticket className="size-3.5" />
        Mam kod promocyjny
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => {
          if (e.key === "Enter") void handleRedeem();
        }}
        placeholder="Kod promocyjny"
        maxLength={64}
        className="w-48 font-mono uppercase"
        aria-label="Kod promocyjny"
      />
      <Button variant="secondary" onClick={handleRedeem} disabled={loading}>
        {loading ? "Aktywuję…" : "Aktywuj"}
      </Button>
      <Button variant="ghost" onClick={() => setOpen(false)}>
        Anuluj
      </Button>
    </div>
  );
}
