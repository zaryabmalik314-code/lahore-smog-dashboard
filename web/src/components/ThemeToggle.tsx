"use client";

import { useEffect, useState } from "react";

type Theme = "civic" | "console";

const STORAGE_KEY = "laq-theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("console");

  useEffect(() => {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    } catch {
      // Private browsing or blocked storage — fall back to the default.
    }
    const initial: Theme = stored === "civic" ? "civic" : "console";
    setTheme(initial);
    document.documentElement.dataset.theme = initial;
  }, []);

  const pick = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Preference simply does not persist; the page still renders correctly.
    }
  };

  return (
    <div className="flex items-center gap-0.5 no-print" role="group" aria-label="Theme">
      {(["civic", "console"] as Theme[]).map((t) => (
        <button
          key={t}
          onClick={() => pick(t)}
          aria-pressed={theme === t}
          className="text-[10px] uppercase tracking-[0.1em] px-2 py-1 transition-colors"
          style={{
            color: theme === t ? "var(--masthead-ink)" : "var(--masthead-ink-3)",
            borderBottom: theme === t ? "1px solid var(--masthead-ink)" : "1px solid transparent",
          }}
        >
          {t === "civic" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
