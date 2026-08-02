import { cn } from "@/lib/utils";
import { colorTagMeta, formatTimeRange } from "@/lib/item-visuals";
import { STATUS_META, getStatus, toISO, type Item } from "@/lib/deadline-types";

const WEEKDAYS = ["pon", "wt", "śr", "czw", "pt", "sob", "ndz"];

export function WeekBoard({
  days,
  byDate,
  today,
  selected,
  onSelectDay,
  onOpen,
}: {
  days: Date[];
  byDate: Map<string, Item[]>;
  today: Date;
  selected: string | null;
  onSelectDay: (iso: string) => void;
  onOpen: (item: Item) => void;
}) {
  return (
    <div className="panel grid grid-cols-1 gap-2 p-2 sm:grid-cols-7 sm:p-4">
      {days.map((date, index) => {
        const iso = toISO(date);
        const dayItems = byDate.get(iso) ?? [];
        const isToday = iso === toISO(today);
        return (
          <div
            key={iso}
            className={cn(
              "flex min-h-32 flex-col gap-2 rounded-lg border p-2",
              selected === iso ? "border-primary ring-1 ring-primary" : "border-border",
            )}
          >
            <button
              type="button"
              onClick={() => onSelectDay(iso)}
              className="flex items-center justify-between text-left"
            >
              <span className="text-xs text-muted-foreground">{WEEKDAYS[index]}</span>
              <span
                className={cn(
                  "text-xs font-medium",
                  isToday &&
                    "grid size-5 place-items-center rounded-full bg-primary text-primary-foreground",
                )}
              >
                {date.getDate()}
              </span>
            </button>

            <ul className="space-y-1">
              {dayItems.map((item) => {
                const meta = colorTagMeta(item.color_tag);
                const range = formatTimeRange(item.start_time, item.end_time);
                return (
                  <li key={item.id}>
                    <div
                      className={cn(
                        "rounded-md border-l-4",
                        meta.soft,
                        meta.border,
                        meta.text,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => onOpen(item)}
                        className="w-full px-2 py-1 text-left text-[11px]"
                      >
                        <span className="block truncate font-medium">{item.name}</span>
                        <span className="block truncate opacity-80">
                          {range ?? STATUS_META[getStatus(item.expiry_date)].label}
                        </span>
                      </button>
                      <ContactActions item={item} compact className="px-1 pb-1" />
                    </div>
                  </li>
                );
              })}

            </ul>
          </div>
        );
      })}
    </div>
  );
}
