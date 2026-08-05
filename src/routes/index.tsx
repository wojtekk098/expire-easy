import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ItemDialog } from "@/components/ItemDialog";
import { ItemRow } from "@/components/ItemRow";
import { ItemDetailsSheet } from "@/components/ItemDetailsSheet";
import { useDeadlines } from "@/lib/deadline-store";
import { STATUS_META, daysLeft, getStatus, type Item, type ItemStatus } from "@/lib/deadline-types";
import { cn } from "@/lib/utils";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Terminy ważności pod kontrolą",
      description:
        "Pilnuj polis, certyfikatów, umów, domen i przeglądów w jednym miejscu. Zobacz od razu, co wygasło i co kończy się w najbliższych dniach.",
      ogTitle: "Deadline — pilnuj terminów ważności w firmie",
      ogDescription: "Podsumowanie terminów ważności Twojej firmy w jednym widoku.",
    }),
  component: Dashboard,
});

const CARDS: { status: ItemStatus; title: string; hint: string }[] = [
  { status: "expired", title: "Przeterminowane", hint: "Zajmij się tym od razu" },
  { status: "urgent", title: "W ciągu 7 dni", hint: "Kończy się w tym tygodniu" },
  { status: "soon", title: "W ciągu 30 dni", hint: "Warto zaplanować" },
  { status: "valid", title: "Aktualne", hint: "Nic nie wymaga uwagi" },
];

function Dashboard() {
  const { items, deleteItem, ready } = useDeadlines();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [viewing, setViewing] = useState<Item | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const counts = useMemo(() => {
    const base: Record<ItemStatus, number> = { expired: 0, urgent: 0, soon: 0, valid: 0 };
    for (const i of items) base[getStatus(i.expiry_date)] += 1;
    return base;
  }, [items]);

  const urgentList = useMemo(
    () =>
      [...items]
        .sort((a, b) => daysLeft(a.expiry_date) - daysLeft(b.expiry_date))
        .filter((i) => getStatus(i.expiry_date) !== "valid")
        .slice(0, 6),
    [items],
  );

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Twoje terminy</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {counts.expired > 0
              ? `${counts.expired} ${counts.expired === 1 ? "pozycja jest przeterminowana" : "pozycje są przeterminowane"} — warto to nadrobić.`
              : "Nic nie wygasło. Trzymaj tak dalej."}
          </p>
        </div>
        <Button onClick={openNew} className="shrink-0">
          <Plus className="size-4" />
          Dodaj termin
        </Button>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => {
          const meta = STATUS_META[card.status];
          return (
            <Link
              key={card.status}
              to="/pozycje"
              search={{ status: card.status }}
              className="panel group p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", meta.dot)} />
                <span className="text-sm font-medium text-muted-foreground">{card.title}</span>
              </div>
              <p className={cn("mt-3 text-3xl font-semibold", meta.text)}>
                {ready ? counts[card.status] : "–"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.hint}</p>
            </Link>
          );
        })}
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-semibold">Najpilniejsze</h2>
          <Link to="/pozycje" search={{ status: "all" }} className="text-sm text-primary hover:underline">
            Zobacz wszystkie
          </Link>
        </div>

        {urgentList.length === 0 ? (
          <div className="panel flex flex-col items-center gap-3 px-6 py-12 text-center">
            <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
              <CalendarClock className="size-5" />
            </span>
            <p className="font-medium">
              {items.length === 0
                ? "Brak pozycji — dodaj pierwszy termin do śledzenia"
                : "Na razie spokój — nic nie wygasa w ciągu 30 dni"}
            </p>
            {items.length === 0 && (
              <Button onClick={openNew} variant="outline">
                <Plus className="size-4" />
                Dodaj termin
              </Button>
            )}
          </div>
        ) : (
          <ul className="space-y-2">
            {urgentList.map((item) => (
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

      <ItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} />
    </div>
  );
}
