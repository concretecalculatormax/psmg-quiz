"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useProgress } from "@/lib/progress";

const LINKS = [
  { href: "/", label: "Topics" },
  { href: "/mock-exam", label: "Mock exam" },
  { href: "/review", label: "Review" },
  { href: "/glossary", label: "Abbreviations" },
];

function isActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  return href === "/" ? pathname === "/" || pathname.startsWith("/topics") : pathname.startsWith(href);
}

/** Plain links; also the Suspense fallback while the pathname is unknown during prerender. */
export function NavLinks({ pathname = null }: { pathname?: string | null }) {
  const reviewCount = Object.keys(useProgress().missed).length;
  return (
    <ul className="flex gap-1 overflow-x-auto text-sm">
      {LINKS.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 whitespace-nowrap ${
                active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:text-foreground"
              }`}
            >
              {label}
              {href === "/review" && reviewCount > 0 && (
                <span className="rounded-full bg-wrong-soft px-1.5 text-xs font-medium text-wrong tabular-nums">
                  {reviewCount}
                </span>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function ActiveNavLinks() {
  return <NavLinks pathname={usePathname()} />;
}
