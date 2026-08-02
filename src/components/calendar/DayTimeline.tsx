import { useRef } from "react";

import { cn } from "@/lib/utils";
import { colorTagMeta, minutesToTime, timeToMinutes } from "@/lib/item-visuals";
import type { Item } from "@/lib/deadline-types";

const START_HOUR = 7;
const END_HOUR = 21;
const HOUR_PX = 56;
const SNAP_MIN = 15;
const DEFAULT_DURATION = 60;

export type TimeChange = { start_time: string; end_time: string };

function duration(item: Item): number {
  const s = timeToMinutes(item.start_time);
  const e = timeToMinutes(item.end_time);
  if (s === null) return DEFAULT_DURATION;
  if (e === null || e <= s) return DEFAULT_DURATION;
  return e - s;
}

export function DayTimeline({
  items,
  onOpen,
  onChangeTime,
}: {
  items: Item[];
  onOpen: (item: Item) => void;
  onChangeTime: (item: Item, change: TimeChange) => void;
}) {
  const gridRef = useRef<HTMLDivElement>(null);
  const dragged = useRef<{ id: string; grabOffsetMin: number } | null>(null);

  const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);
  const timed = items.filter((i) => timeToMinutes(i.start_time) !== null);
  const untimed = items.filter((i) => timeToMinutes(i.start_time) === null);

  const dropAt = (clientY: number) => {
    const rect = gridRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const raw = ((clientY - rect.top) / HOUR_PX) * 60 + START_HOUR * 60;
    return raw;
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const info = dragged.current;
    const raw = dropAt(event.clientY);
    if (!info || raw === null) return;
    const item = items.find((i) => i.id === info.id);
    if (!item) return;
    const len = duration(item);
    const snapped =
      Math.round((raw - info.grabOffsetMin) / SNAP_MIN) * SNAP_MIN;
    const start = Math.max(
      START_HOUR * 60,
      Math.min((END_HOUR + 1) * 60 - len, snapped),
    );
    onChangeTime(item, {
      start_time: minutesToTime(start),
      end_time: minutesToTime(start + len),
    });
    dragged.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="panel overflow-hidden">
        <div className="flex">
          <div className="w-14 shrink-0 border-r border-border">
            {hours.map((h) => (
              <div
                key={h}
                className="pr-2 pt-1 text-right text-[11px] text-muted-foreground"
                style={{ height: HOUR_PX }}
              >
                {`${h}`.padStart(2, "0")}:00
              </div>
            ))}
          </div>

          <div
            ref={gridRef}
            className="relative min-w-0 flex-1"
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
            }}
            onDrop={handleDrop}
          >
            {hours.map((h) => (
              <div
                key={h}
                className="border-b border-border/70 last:border-b-0"
                style={{ height: HOUR_PX }}
              >
                <div className="h-1/2 border-b border-dashed border-border/40" />
              </div>
            ))}

            {timed.map((item, index) => {
              const start = timeToMinutes(item.start_time)!;
              const len = duration(item);
              const top = ((start - START_HOUR * 60) / 60) * HOUR_PX;
              const height = Math.max(24, (len / 60) * HOUR_PX - 4);
              const meta = colorTagMeta(item.color_tag);
              const overlapShift = (index % 3) * 6;
              return (
                <div
                  key={item.id}
                  draggable
                  onDragStart={(e) => {
                    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                    dragged.current = {
                      id: item.id,
                      grabOffsetMin: ((e.clientY - rect.top) / HOUR_PX) * 60,
                    };
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", item.id);
                  }}
                  className={cn(
                    "absolute left-1 right-1 flex cursor-grab items-start gap-1 overflow-hidden rounded-md border-l-4 px-2 py-1 text-left text-xs shadow-sm transition-colors active:cursor-grabbing",
                    meta.soft,
                    meta.border,
                    meta.text,
                  )}
                  style={{
                    top: Math.max(0, top),
                    height,
                    marginLeft: overlapShift,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onOpen(item)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate font-medium">{item.name}</span>
                    <span className="block truncate opacity-80">
                      {minutesToTime(start)}–{minutesToTime(start + len)} · {item.category}
                    </span>
                  </button>
                  <ContactActions item={item} compact />
                </div>
              );
            })}

          </div>
        </div>
      </div>

      {untimed.length > 0 && (
        <div className="panel space-y-2 p-4">
          <p className="text-sm font-medium">Bez godziny</p>
          <p className="text-xs text-muted-foreground">
            Kliknij, żeby wstawić na osi o 9:00 — potem przeciągnij, gdzie chcesz.
          </p>
          <ul className="flex flex-wrap gap-2">
            {untimed.map((item) => {
              const meta = colorTagMeta(item.color_tag);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeTime(item, { start_time: "09:00", end_time: "10:00" })
                    }
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors hover:opacity-90",
                      meta.soft,
                      meta.border,
                      meta.text,
                    )}
                  >
                    <span className={cn("size-2 rounded-full", meta.dot)} />
                    {item.name}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
