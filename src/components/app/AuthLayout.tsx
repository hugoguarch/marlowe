import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { Sphere } from "./Sphere";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-app-bg text-ink-navy">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <Link to="/" className="text-[0.68rem] tracking-[0.22em] text-ink-navy/50 uppercase">
          ← Why Media AI
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md rounded-3xl border border-app-line bg-app-card p-8 shadow-[0_30px_80px_-60px_rgba(20,40,70,0.55)] sm:p-10">
            <div className="flex flex-col items-center text-center">
              <Sphere size={56} />
              <h1 className="display mt-6 text-[1.75rem] font-light tracking-tight">{title}</h1>
              {subtitle ? (
                <p className="mt-2 text-sm leading-relaxed text-ink-navy/55">{subtitle}</p>
              ) : null}
            </div>

            <div className="mt-8">{children}</div>
          </div>
        </div>

        {footer ? (
          <div className="pb-4 text-center text-xs text-ink-navy/45">{footer}</div>
        ) : null}
      </div>
    </main>
  );
}

export const fieldClass =
  "w-full rounded-xl border border-app-line bg-app-bg/60 px-4 py-3 text-sm text-ink-navy outline-none transition-colors placeholder:text-ink-navy/35 focus:border-cerulean focus:bg-app-card";

export const primaryButtonClass =
  "w-full rounded-full bg-ink-navy px-6 py-3 text-xs tracking-[0.16em] text-white uppercase transition-all duration-300 hover:-translate-y-0.5 hover:bg-cerulean disabled:cursor-not-allowed disabled:opacity-60";

export const ghostButtonClass =
  "flex w-full items-center justify-center gap-3 rounded-full border border-app-line bg-app-card px-6 py-3 text-xs tracking-[0.14em] text-ink-navy uppercase transition-all duration-300 hover:-translate-y-0.5 hover:border-cerulean/60";

export function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5Z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.5 6.9l7 5.4c4.1-3.8 6.5-9.4 6.5-16.1l.7-.7Z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.6a14.4 14.4 0 0 1 0-9.2l-7.8-6.1a24 24 0 0 0 0 21.4l7.8-6.1Z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.2 0 11.5-2 15.3-5.6l-7-5.4c-2 1.4-4.7 2.2-8.3 2.2-6.4 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48Z"
      />
    </svg>
  );
}
