// Display theme — Light / Dark / System preference for the Sensiblee surfaces.
// The choice persists in localStorage and the resolved mode toggles the `dark`
// class on <html>. How that class looks per surface is handled by the scoped
// skins in globals.css (client dashboard, admin console, marketing re-pin).
// An inline pre-hydration script in app/layout.tsx applies the stored
// preference before first paint to avoid a light/dark flash.
"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore } from "react";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "sensiblee-theme";

/* ---- external store: localStorage preference, OS scheme + cross-tab events ---- */

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) cb();
  };
  mq.addEventListener("change", cb);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

/* --------------------------------- context --------------------------------- */

type ThemeContextValue = {
  /** Raw preference as chosen by the user. */
  theme: ThemePreference;
  /** Effectively applied mode ("system" resolves against the OS setting). */
  resolved: ResolvedTheme;
  setTheme: (t: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const resolved: ResolvedTheme =
    theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? "dark"
      : "light";

  // Reflect the resolved mode onto <html> (also applied pre-hydration inline)
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    // Native widgets + scrollbars follow the scheme as well
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setTheme = useCallback((pref: ThemePreference) => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      /* private mode — preference stays session-only */
    }
    emit();
  }, []);

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
