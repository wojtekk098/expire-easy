import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ItemDialog } from "@/components/ItemDialog";
import { ItemRow } from "@/components/ItemRow";
import { useDeadlines } from "@/lib/deadline-store";
import { daysLeft, getStatus, STATUS_META, type Item, type ItemStatus } from "@/lib/deadline-types";

type SearchParams = { status: string };

export const Route = createFileRoute("/pozycje")({
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    status: typeof search["status"] === "string" ? (search["status"] as string) : "all",
  }),
  head: () => ({
    meta: [
      { title: "Wszystkie pozycje — Deadline" },
      {
        name: "description",
        content:
          "Lista wszystkich śledzonych terminów z filtrowaniem po kategorii i statusie oraz sortowaniem po dacie.",
      },
      { property: "og:title", content: "Wszystkie pozycje — Deadline" },
      {
        property: "og:description",
        content: "Filtruj i sortuj terminy ważności swojej firmy.",
      },
    ],
  }),
  component: ItemsPage,
});

const ALL = "all";

function ItemsPage() {
  const { status: initialStatus } = Route.useSearch();
  const { items, categories, deleteItem } = useDeadlines();
  const [status, setStatus] = useState<string>(initialStatus ?? ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date-asc" | "date-desc" | "name">("date-asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);

  const visible = useMemo(() => {
    let list = [...items];
    if (status !== ALL) list = list.filter((i) => getStatus(i.expiry_date) === status);
    if (category !== ALL) list = list.filter((i) => i.category === category);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.notes ?? "").toLowerCase().includes(q),
      );
    }
    list.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name, "pl");
      const diff = daysLeft(a.expiry_date) - daysLeft(b.expiry_date);
      return sort === "date-asc" ? diff : -diff;
    });
    return list;
  }, [items, status, category, query, sort]);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold">Wszystkie pozycje</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "śledzony termin" : "śledzonych terminów"}
          </p>
        </div>
        <Button
          className="shrink-0"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="size-4" />
          Dodaj termin
        </Button>
      </header>

      <div className="panel grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Szukaj…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Kategoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie kategorie</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Wszystkie statusy</SelectItem>
            {(Object.keys(STATUS_META) as ItemStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
          <SelectTrigger>
            <SelectValue placeholder="Sortowanie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date-asc">Najbliższy termin</SelectItem>
            <SelectItem value="date-desc">Najdalszy termin</SelectItem>
            <SelectItem value="name">Nazwa A–Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {visible.length === 0 ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-medium">
            {items.length === 0
              ? "Brak pozycji — dodaj pierwszy termin do śledzenia"
              : "Nic nie pasuje do tych filtrów"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {items.length === 0
              ? "Wystarczy nazwa i data ważności."
              : "Zmień kategorię lub status, żeby zobaczyć więcej."}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visible.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              onEdit={() => {
                setEditing(item);
                setDialogOpen(true);
              }}
              onDelete={() => deleteItem(item.id)}
            />
          ))}
        </ul>
      )}

      <ItemDialog open={dialogOpen} onOpenChange={setDialogOpen} item={editing} />
    </div>
  );
}
