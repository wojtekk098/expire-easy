import { useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEFAULT_CATEGORIES, type Item } from "./deadline-types";
import { syncReminderItems } from "./reminders.functions";
import {
  StoreContext,
  type DeadlineState as State,
  type DeadlineStore as Store,
} from "./deadline-context";

const STORAGE_KEY = "deadline.v1";
export const REMINDER_TOKEN_KEY = "deadline.reminderToken";

export function DeadlineProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ items: [], categories: DEFAULT_CATEGORIES });

  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as State;
        setState({
          items: parsed.items ?? [],
          categories: parsed.categories?.length ? parsed.categories : DEFAULT_CATEGORIES,
        });
      } else {
        setState({ items: [], categories: DEFAULT_CATEGORIES });
      }
    } catch {
      setState({ items: [], categories: DEFAULT_CATEGORIES });
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, ready]);

  // Trzymamy kopię terminów w chmurze, żeby codzienna wysyłka przypomnień
  // wiedziała, co i kiedy wygasa.
  useEffect(() => {
    if (!ready) return;
    const token = localStorage.getItem(REMINDER_TOKEN_KEY);
    if (!token) return;
    const timer = setTimeout(() => {
      syncReminderItems({ data: { token, items: state.items } }).catch(() => undefined);
    }, 800);
    return () => clearTimeout(timer);
  }, [state.items, ready]);


  const value = useMemo<Store>(
    () => ({
      ...state,
      ready,
      addItem: (data) =>
        setState((s) => ({
          ...s,
          items: [...s.items, { ...data, id: crypto.randomUUID() }],
          categories: s.categories.includes(data.category)
            ? s.categories
            : [...s.categories, data.category],
        })),
      // TODO (faza 2): po dodaniu/edycji pozycji wywołać Supabase Edge Function
      // „schedule-reminders”, która zapisze zaplanowane przypomnienia e-mail
      // na podstawie expiry_date i reminder_days_before.
      updateItem: (id, data) =>
        setState((s) => ({
          ...s,
          items: s.items.map((i) => (i.id === id ? { ...data, id } : i)),
          categories: s.categories.includes(data.category)
            ? s.categories
            : [...s.categories, data.category],
        })),
      deleteItem: (id) => setState((s) => ({ ...s, items: s.items.filter((i) => i.id !== id) })),
      addCategory: (name) =>
        setState((s) =>
          s.categories.includes(name) ? s : { ...s, categories: [...s.categories, name] },
        ),
      deleteCategory: (name) =>
        setState((s) => ({ ...s, categories: s.categories.filter((c) => c !== name) })),
    }),
    [state, ready],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useDeadlines(): Store {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useDeadlines musi być użyte wewnątrz DeadlineProvider");
  return ctx;
}
