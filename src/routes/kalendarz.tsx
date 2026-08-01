import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ItemDialog";
import { ItemRow } from "@/components/ItemRow";
import { ItemDetailsSheet } from "@/components/ItemDetailsSheet";
import { useDeadlines } from "@/lib/deadline-store";
import {
  STATUS_META,
  formatPL,
  getStatus,
  startOfToday,
  toISO,
  type Item,
} from "@/lib/deadline-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/kalendarz")({
  head: () => ({
    meta: [
      { title: "Kalendarz terminów — Deadline" },
      {
        name: "description",
        content:
          "Miesięczny widok terminów ważności — kliknij dzień, żeby zobaczyć, co się wtedy kończy.",
      },
      { property: "og:title", content: "Kalendarz terminów — Deadline" },
      {
        property: "og:description",
        content: "Zobacz w kalendarzu, kiedy wygasają Twoje polisy, umowy i licencje.",
      },
    ],
  }),
  component: CalendarPage,
});

const WEEKDAYS = ["pon", "wt", "śr", "czw", "pt", "sob", "ndz"];
const MONTHS = [
  "styczeń",
  "luty",
  "marzec",
  "kwiecień",
  "maj",
  "czerwiec",
  "lipiec",
  "sierpień",
  "wrzesień",
  "październik",
  "listopad",
  "grudzień",
];

function CalendarPage() {
  const { items, deleteItem } = useDeadlines();
  const today = startOfToday();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(toISO(today));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const byDate = useMemo(() => {
    const map = new Map<string, Item[]>();
    for (const item of items) {
      const list = map.get(item.expiry_date) ?? [];
      list.push(item);
      map.set(item.expiry_date, list);
    }
    return map;
  }, [items]);

  const cells = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(1 - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const selectedItems = selected ? (byDate.get(selected) ?? []) : [];

  const move = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Kalendarz</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kliknij dzień, żeby zobaczyć, co się wtedy kończy.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label="Poprzedni miesiąc">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-36 text-center text-sm font-medium capitalize">
            {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
          </span>
          <Button variant="outline" size="icon" onClick={() => move(1)} aria-label="Następny miesiąc">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </header>

      <div className="panel p-2 sm:p-4">
        <div className="grid grid-cols-7 gap-1 pb-2 text-center text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date) => {
            const iso = toISO(date);
            const dayItems = byDate.get(iso) ?? [];
            const inMonth = date.getMonth() === cursor.getMonth();
            const isToday = iso === toISO(today);
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  "flex min-h-16 flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors sm:min-h-20 sm:p-2",
                  inMonth ? "border-border bg-card" : "border-transparent bg-muted/40",
                  selected === iso && "border-primary ring-1 ring-primary",
                  "hover:bg-accent/60",
                )}
              >
                <span
                  className={cn(
                    "text-xs font-medium",
                    !inMonth && "text-muted-foreground",
                    isToday &&
                      "grid size-5 place-items-center rounded-full bg-primary text-primary-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                <span className="flex flex-wrap gap-1">
                  {dayItems.slice(0, 4).map((item) => (
                    <span
                      key={item.id}
                      className={cn(
                        "size-2 rounded-full",
                        STATUS_META[getStatus(item.expiry_date)].dot,
                      )}
                    />
                  ))}
                </span>
                {dayItems.length > 0 && (
                  <span className="hidden truncate text-[11px] text-muted-foreground sm:block sm:max-w-full">
                    {dayItems.length === 1 ? dayItems[0]!.name : `${dayItems.length} terminy`}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{selected ? formatPL(selected) : "Wybierz dzień"}</h2>
        {selectedItems.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
            <p className="font-medium">Tego dnia nic nie wygasa</p>
            {selected && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="size-4" />
                Dodaj termin na ten dzień
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {selectedItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onEdit={() => {
                  setEditing(item);
                  setDialogOpen(true);
                }}
                onDelete={() => deleteItem(item.id)}
                onOpen={() => {
                  setViewing(item);
                  setDetailsOpen(true);
                }}
              />
            ))}
          </ul>
        )}
      </section>

      <ItemDetailsSheet
        item={viewing}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onEdit={() => {
          setDetailsOpen(false);
          setEditing(viewing);
          setDialogOpen(true);
        }}
        onDelete={() => viewing && deleteItem(viewing.id)}
      />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        {...(selected ? { defaultDate: selected } : {})}
      />
    </div>
  );
}
