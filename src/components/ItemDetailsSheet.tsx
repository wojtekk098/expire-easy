import { CalendarDays, Bell, FileText, Pencil, Tag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/StatusBadge";
import { formatPL, friendlyMessage, plDni, daysLeft, type Item } from "@/lib/deadline-types";

export function ItemDetailsSheet({
  item,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: {
  item: Item | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Sheet open={open && !!item} onOpenChange={onOpenChange}>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        {item && (
          <>
            <SheetHeader>
              <SheetTitle className="text-xl">{item.name}</SheetTitle>
              <SheetDescription>{friendlyMessage(item)}</SheetDescription>
              <div className="pt-1">
                <StatusBadge expiryDate={item.expiry_date} />
              </div>
            </SheetHeader>

            <div className="space-y-4 px-4 pb-4">
              <DetailRow icon={<CalendarDays className="size-4" />} label="Data ważności">
                <p className="font-medium">{formatPL(item.expiry_date)}</p>
                <p className="text-sm text-muted-foreground">{remaining(item)}</p>
              </DetailRow>

              <DetailRow icon={<Tag className="size-4" />} label="Kategoria">
                <p className="font-medium">{item.category}</p>
              </DetailRow>

              <DetailRow icon={<Bell className="size-4" />} label="Przypomnienia">
                {item.reminder_days_before.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Brak przypomnień</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {[...item.reminder_days_before]
                      .sort((a, b) => b - a)
                      .map((d) => (
                        <span
                          key={d}
                          className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium"
                        >
                          {d} {plDni(d)} przed
                        </span>
                      ))}
                  </div>
                )}
                {/* TODO (integracja powiadomień): tutaj pokażemy historię wysłanych
                    e-maili z Supabase Edge Function `send-reminders`. */}
                <p className="mt-2 text-xs text-muted-foreground">
                  E-maile z przypomnieniami włączysz w Ustawieniach.
                </p>
              </DetailRow>

              <DetailRow icon={<FileText className="size-4" />} label="Notatka">
                {item.notes ? (
                  <p className="whitespace-pre-line text-sm">{item.notes}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Brak notatki</p>
                )}
              </DetailRow>
            </div>

            <SheetFooter className="flex-row gap-2">
              <Button className="flex-1" onClick={onEdit}>
                <Pencil className="size-4" />
                Edytuj
              </Button>
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  onDelete();
                  onOpenChange(false);
                  toast.success("Pozycja usunięta");
                }}
              >
                <Trash2 className="size-4" />
                Usuń
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function remaining(item: Item): string {
  const d = daysLeft(item.expiry_date);
  if (d < 0) return `po terminie o ${Math.abs(d)} ${plDni(Math.abs(d))}`;
  if (d === 0) return "termin jest dziś";
  return `zostało ${d} ${plDni(d)}`;
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-xl border border-border bg-card p-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-1">{children}</div>
      </div>
    </div>
  );
}
