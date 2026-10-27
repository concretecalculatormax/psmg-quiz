import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";

import { ActiveNavLinks, NavLinks } from "@/components/SiteNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PSMG MCQ Bank",
    template: "%s · PSMG MCQ Bank",
  },
  description: "Practice MCQs for the 42nd PSMG Comprehensive Exam, topic by topic.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="grid size-7 place-items-center rounded-md bg-accent text-sm text-surface">
                Q
              </span>
              PSMG MCQ Bank
            </Link>
            <nav aria-label="Main" className="-mx-3 sm:mx-0">
              <Suspense fallback={<NavLinks />}>
                <ActiveNavLinks />
              </Suspense>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-border py-6 text-center text-xs text-muted">
          Questions drawn from course presentations and study tour reports. Progress is saved in this
          browser only.
        </footer>
      </body>
    </html>
  );
}
