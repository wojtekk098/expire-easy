import { Mail, MessageCircle, Phone } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Item } from "@/lib/deadline-types";

/** Sam numer w formacie akceptowanym przez wa.me (tylko cyfry). */
export function waNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function hasContactActions(item: Item): boolean {
  return Boolean(item.contact_email || item.contact_phone);
}

export function ContactActions({
  item,
  className,
  compact = false,
}: {
  item: Item;
  className?: string;
  compact?: boolean;
}) {
  if (!hasContactActions(item)) return null;

  const iconSize = compact ? "size-3.5" : "size-4";
  const buttonClass = cn(
    "inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
    compact ? "size-6" : "size-8",
  );
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const who = item.contact_name ? ` (${item.contact_name})` : "";
  const digits = item.contact_phone ? waNumber(item.contact_phone) : "";

  return (
    <div className={cn("flex items-center gap-1", className)} onClick={stop}>
      {item.contact_email ? (
        <a
          href={`mailto:${item.contact_email}`}
          onClick={stop}
          className={buttonClass}
          title={`Napisz e-mail: ${item.contact_email}`}
          aria-label={`Napisz e-mail${who}`}
        >
          <Mail className={iconSize} />
        </a>
      ) : null}
      {item.contact_phone ? (
        <a
          href={`tel:${item.contact_phone.replace(/[^\d+]/g, "")}`}
          onClick={stop}
          className={buttonClass}
          title={`Zadzwoń: ${item.contact_phone}`}
          aria-label={`Zadzwoń${who}`}
        >
          <Phone className={iconSize} />
        </a>
      ) : null}
      {digits ? (
        <a
          href={`https://wa.me/${digits}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={stop}
          className={buttonClass}
          title="Napisz na WhatsApp"
          aria-label={`Napisz na WhatsApp${who}`}
        >
          <MessageCircle className={iconSize} />
        </a>
      ) : null}
    </div>
  );
}
