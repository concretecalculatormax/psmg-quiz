"use client";

import type { Topic } from "@/lib/types";

// Loads every topic from the static /api/questions file once per page load (~100 KB gzipped).
const RETRIES = 2;
let pending: Promise<Topic[]> | null = null;

async function load(): Promise<Topic[]> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch("/api/questions");
      if (!res.ok) throw new Error(`GET /api/questions failed with ${res.status}`);
      return (await res.json()) as Topic[];
    } catch (error) {
      if (attempt >= RETRIES) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
    }
  }
}

export function fetchAllTopics(): Promise<Topic[]> {
  if (!pending) {
    pending = load();
    // Let a later call try again instead of caching the failure.
    pending.catch(() => {
      pending = null;
    });
  }
  return pending;
}

export async function fetchTopics(slugs: string[]): Promise<Topic[]> {
  const wanted = new Set(slugs);
  return (await fetchAllTopics()).filter((t) => wanted.has(t.slug));
}
