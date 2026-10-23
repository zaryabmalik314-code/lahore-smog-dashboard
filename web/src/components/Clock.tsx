"use client";

import { useEffect, useState } from "react";

/**
 * Isolated on purpose.
 *
 * Held in the dashboard, a once-a-second state change made React reconcile the
 * entire page — hero, tables, charts and map — sixty times a minute to update
 * eight characters. Keeping the ticking state in its own leaf means only this
 * subtree re-renders.
 */
export default function Clock() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-GB", {
          timeZone: "Asia/Karachi",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="font-mono text-xs tabular" style={{ color: "var(--masthead-ink)" }}>
      {time} <span style={{ color: "var(--masthead-ink-3)" }}>PKT</span>
    </span>
  );
}
