import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useDeadlines } from "@/lib/deadline-store";
import { COLOR_TAGS } from "@/lib/item-visuals";
import {
  DEFAULT_REMINDERS,
  RECURRENCE_OPTIONS,
  toISO,
  type Item,
  type RecurrenceRule,
} from "@/lib/deadline-types";


const NEW_CATEGORY = "__new__";
const REMINDER_OPTIONS = [60, 30, 14, 7, 3, 1];

export function ItemDialog({
  open,
  onOpenChange,
  item,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: Item | null;
  defaultDate?: string;
}) {
  const { categories, addItem, updateItem } = useDeadlines();
  const [name, setName] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "Inne");
  const [newCategory, setNewCategory] = useState("");
  const [expiry, setExpiry] = useState("");
  const [notes, setNotes] = useState("");
  const [reminders, setReminders] = useState<number[]>(DEFAULT_REMINDERS);
  const [colorTag, setColorTag] = useState<string>("blue");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceRule>("monthly");

  useEffect(() => {
    if (!open) return;
    setName(item?.name ?? "");
    setCategory(item?.category ?? categories[0] ?? "Inne");
    setNewCategory("");
    setExpiry(item?.expiry_date ?? defaultDate ?? toISO(new Date()));
    setNotes(item?.notes ?? "");
    setReminders(item?.reminder_days_before ?? DEFAULT_REMINDERS);
    setColorTag(item?.color_tag ?? "blue");
    setStartTime(item?.start_time?.slice(0, 5) ?? "");
    setEndTime(item?.end_time?.slice(0, 5) ?? "");
    setContactName(item?.contact_name ?? "");
    setContactEmail(item?.contact_email ?? "");
    setContactPhone(item?.contact_phone ?? "");
    setIsRecurring(Boolean(item?.is_recurring));
    setRecurrence((item?.recurrence_rule as RecurrenceRule) ?? "monthly");
  }, [open, item, defaultDate, categories]);


  const toggleReminder = (day: number) =>
    setReminders((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a),
    );

  const submit = () => {
    const finalCategory = category === NEW_CATEGORY ? newCategory.trim() : category;
    if (!name.trim()) {
      toast.error("Podaj nazwę pozycji");
      return;
    }
    if (!finalCategory) {
      toast.error("Podaj nazwę nowej kategorii");
      return;
    }
    if (!expiry) {
      toast.error("Wybierz datę ważności");
      return;
    }
    if (contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail.trim())) {
      toast.error("Podaj poprawny e-mail kontaktu");
      return;
    }
    const payload = {
      ...(item ?? {}),
      name: name.trim(),
      category: finalCategory,
      expiry_date: expiry,
      notes: notes.trim(),
      reminder_days_before: reminders.length ? reminders : [7],
      color_tag: colorTag,
      start_time: startTime || null,
      end_time: endTime || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrence : null,
    };

    delete (payload as { id?: string }).id;

    if (item) {
      updateItem(item.id, payload);
      toast.success("Zmiany zapisane");
    } else {
      addItem(payload);
      toast.success("Termin dodany — przypomnimy Ci zawczasu");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edytuj termin" : "Nowy termin"}</DialogTitle>
          <DialogDescription>
            Wpisz, co i kiedy się kończy. Damy znać, zanim to wygaśnie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Nazwa</Label>
            <Input
              id="item-name"
              placeholder="np. Polisa OC firmy"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Kategoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz kategorię" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_CATEGORY}>+ Nowa kategoria…</SelectItem>
                </SelectContent>
              </Select>
              {category === NEW_CATEGORY && (
                <Input
                  placeholder="Nazwa nowej kategorii"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="item-date">Data ważności</Label>
              <Input
                id="item-date"
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-start">Godzina od (opcjonalna)</Label>
              <Input
                id="item-start"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-end">Godzina do (opcjonalna)</Label>
              <Input
                id="item-end"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Kolor oznaczenia</Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_TAGS.map((tag) => (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => setColorTag(tag.value)}
                  aria-label={tag.label}
                  aria-pressed={colorTag === tag.value}
                  title={tag.label}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    colorTag === tag.value
                      ? cn(tag.border, tag.soft, tag.text)
                      : "border-border bg-card text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span className={cn("size-2.5 rounded-full", tag.dot)} />
                  {tag.label}
                </button>
              ))}
            </div>
          </div>



          <div className="space-y-2">
            <Label htmlFor="item-notes">Notatka (opcjonalna)</Label>
            <Textarea
              id="item-notes"
              placeholder="np. numer polisy, kontakt do agenta"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Przypomnij mi przed terminem</Label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((day) => {
                const active = reminders.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleReminder(day)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {day === 1 ? "1 dzień" : `${day} dni`}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Powiadomienia e-mail włączymy w Ustawieniach.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Anuluj
          </Button>
          <Button onClick={submit}>{item ? "Zapisz zmiany" : "Dodaj termin"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
