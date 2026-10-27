"use client";

import { useDeferredValue, useState, type ReactNode } from "react";

import type { GlossaryGroup } from "@/lib/types";

function highlight(text: string, query: string): ReactNode {
  if (!query) return text;
  const lower = text.toLowerCase();
  const parts: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(query, from);
  while (at !== -1) {
    parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-flag-soft text-foreground">
        {text.slice(at, at + query.length)}
      </mark>,
    );
    from = at + query.length;
    at = lower.indexOf(query, from);
  }
  parts.push(text.slice(from));
  return parts;
}

export function GlossarySearch({ groups }: { groups: GlossaryGroup[] }) {
  const [query, setQuery] = useState("");
  const [groupIndex, setGroupIndex] = useState(-1);
  const q = useDeferredValue(query.trim().toLowerCase());

  const results = groups
    .map((group, index) => ({
      group,
      index,
      entries: group.entries.filter(
        (e) =>
          !q ||
          e.abbr.toLowerCase().includes(q) ||
          (e.full ?? "").toLowerCase().includes(q) ||
          (e.note ?? "").toLowerCase().includes(q),
      ),
    }))
    .filter((r) => (groupIndex === -1 || r.index === groupIndex) && r.entries.length > 0);
  const total = results.reduce((sum, r) => sum + r.entries.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-2 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Search abbreviations</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. PEEDA, audit, commission…"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-accent"
          />
        </label>
        <label>
          <span className="sr-only">Filter by section</span>
          <select
            value={groupIndex}
            onChange={(e) => setGroupIndex(Number(e.target.value))}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm sm:w-72"
          >
            <option value={-1}>All sections</option>
            {groups.map((g, i) => (
              <option key={g.title} value={i}>
                {g.topicId !== null ? `Topic ${g.topicId} · ` : ""}
                {g.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-muted" aria-live="polite">
        {total} {total === 1 ? "entry" : "entries"}
        {q && <> matching &ldquo;{query.trim()}&rdquo;</>}
      </p>

      {results.map(({ group, entries }) => (
        <section key={group.title} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">
            {group.topicId !== null && <span className="mr-2 font-mono text-xs text-muted">Topic {group.topicId}</span>}
            {group.title}
          </h2>
          <dl className="overflow-hidden rounded-xl border border-border bg-surface text-sm">
            {entries.map((e) => (
              <div
                key={e.abbr}
                className="grid gap-1 border-t border-border px-4 py-2 first:border-t-0 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-4"
              >
                <dt className="font-medium">{highlight(e.abbr, q)}</dt>
                <dd>
                  {e.full ? highlight(e.full, q) : <span className="text-muted italic">{highlight(e.note ?? "", q)}</span>}
                  {e.inferred && (
                    <span className="ml-1 text-muted" title="Standard full form; not spelled out in the source">
                      †
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}

      {total === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted">
          No abbreviations match. Try a shorter search.
        </p>
      )}
    </div>
  );
}
