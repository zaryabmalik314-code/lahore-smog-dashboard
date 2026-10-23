"use client";

type Theme = "civic" | "console";

const STORAGE_KEY = "laq-theme";

/**
 * Stateless by design.
 *
 * The stored preference is applied by an inline script before first paint, so
 * the attribute on <html> is already correct when this mounts. Holding the
 * same value in React state as well would mean reading storage after
 * hydration and writing it back, which is both a second source of truth and a
 * visible flash. The active button is styled from that attribute in CSS.
 */
function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Preference does not persist; the page still renders correctly.
  }
}

export default function ThemeToggle() {
  return (
    <div className="flex items-center gap-0.5 no-print" role="group" aria-label="Theme">
      {(["civic", "console"] as Theme[]).map((t) => (
        <button
          key={t}
          type="button"
          data-theme-option={t}
          onClick={() => apply(t)}
          className="theme-option text-[10px] uppercase tracking-[0.1em] px-2 py-1 transition-colors"
        >
          {t === "civic" ? "Light" : "Dark"}
        </button>
      ))}
    </div>
  );
}
