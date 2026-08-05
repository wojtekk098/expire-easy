import { createContext, type Context } from "react";
import { DEFAULT_CATEGORIES, type Item } from "./deadline-types";

export type DeadlineState = { items: Item[]; categories: string[] };

export type DeadlineStore = DeadlineState & {
  ready: boolean;
  addItem: (data: Omit<Item, "id">) => void;
  updateItem: (id: string, data: Omit<Item, "id">) => void;
  deleteItem: (id: string) => void;
  addCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
};

export const DEADLINE_DEFAULT_STATE: DeadlineState = {
  items: [],
  categories: DEFAULT_CATEGORIES,
};

// Trzymamy kontekst na globalThis, żeby hot-reload w trybie deweloperskim
// nie tworzył drugiej instancji (to powodowało błąd „musi być użyte wewnątrz
// DeadlineProvider” po zapisie pliku).
const KEY = "__deadlineStoreContext__";
const globalRef = globalThis as unknown as Record<string, Context<DeadlineStore | null>>;

export const StoreContext: Context<DeadlineStore | null> =
  globalRef[KEY] ?? (globalRef[KEY] = createContext<DeadlineStore | null>(null));
