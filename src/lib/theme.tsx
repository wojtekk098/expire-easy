import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "@/hooks/useAuth";

export type Theme = "light" | "dark";

const BASE_KEY = "deadline.theme";

function keyFor(userId: string | null): string {
  return userId ? `${BASE_KEY}:${userId}` : BASE_KEY;
}

function read(userId: string | null): Theme {
  try {
    const stored = localStorage.getItem(keyFor(userId)) ?? localStorage.getItem(BASE_KEY);
    return stored === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

type ThemeStore = {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeStore | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [theme, setThemeState] = useState<Theme>("light");

  // Motyw jest zapisywany per użytkownik (nie z ustawień systemu).
  useEffect(() => {
    const next = read(userId);
    setThemeState(next);
    applyTheme(next);
  }, [userId]);

  const value = useMemo<ThemeStore>(() => {
    const setTheme = (next: Theme) => {
      setThemeState(next);
      applyTheme(next);
      try {
        localStorage.setItem(keyFor(userId), next);
        localStorage.setItem(BASE_KEY, next);
      } catch {
        /* pamięć niedostępna — motyw działa do końca sesji */
      }
    };
    return {
      theme,
      isDark: theme === "dark",
      setTheme,
      toggleTheme: () => setTheme(theme === "dark" ? "light" : "dark"),
    };
  }, [theme, userId]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeStore {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme musi być użyte wewnątrz ThemeProvider");
  return ctx;
}
