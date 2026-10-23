// Display-options switch — Light / System / Dark segmented control.
// `chrome` picks the styling matching the surrounding topbar: "light" for the
// client dashboard, "dark" for the platform console. The opposite mode is
// produced by the scoped skin remaps in globals.css, so the same component
// works in both dashboards across both modes.
"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { cn } from "./deps";

// Hydration-safe "client is live" gate: false during SSR + hydration render,
// true on every client render afterwards — no effects needed.
const emptySubscribe = () => () => {};
const useMounted = () => useSyncExternalStore(emptySubscribe, () => true, () => false);

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "system", label: "System", Icon: Monitor },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ chrome, className }: { chrome: "light" | "dark"; className?: string }) {
  const { theme, setTheme } = useTheme();
  // The active highlight waits for mount — server HTML and the first client
  // render stay identical (the pre-hydration script owns the initial class).
  const mounted = useMounted();
  const active = mounted ? theme : null;

  return (
    <div
      role="group"
      aria-label="Display theme"
      className={cn(
        "flex shrink-0 items-center gap-0.5 rounded-xl border p-0.5",
        chrome === "light" ? "border-neutral-200 bg-white" : "border-white/10 bg-white/5",
        className
      )}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            title={`${label} theme`}
            aria-label={`${label} theme`}
            aria-pressed={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              "rounded-lg p-1.5 transition-colors",
              chrome === "light"
                ? isActive
                  ? "bg-brand text-white shadow-sm"
                  : "text-neutral-400 hover:text-brand"
                : isActive
                  ? "bg-mint text-brand-deep shadow-sm"
                  : "text-white/50 hover:bg-white/5 hover:text-white"
            )}
          >
            <Icon size={13} strokeWidth={2.2} />
          </button>
        );
      })}
    </div>
  );
}
