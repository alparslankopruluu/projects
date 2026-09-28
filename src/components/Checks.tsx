"use client";

import { progressOf } from "@/lib/checks";
import type { CheckItem } from "@/lib/types";

export function Meter({ checks, compact = false }: { checks: CheckItem[]; compact?: boolean }) {
  const { done, total, pct } = progressOf(checks);
  return (
    <div className={compact ? "meter-block compact" : "meter-block"}>
      <div
        className={pct === 100 ? "meter complete" : "meter"}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${done} / ${total} adım`}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="meter-label">
        {done}/{total}
      </span>
    </div>
  );
}

export function CheckLine({ item, onToggle }: { item: CheckItem; onToggle: () => void }) {
  return (
    <label className={item.done ? "checkline done" : "checkline"}>
      <input type="checkbox" checked={item.done} onChange={onToggle} />
      <span className="box" aria-hidden="true" />
      <span>{item.label}</span>
      {item.owner === "apple" && !item.done ? <em>Apple’da</em> : null}
    </label>
  );
}
