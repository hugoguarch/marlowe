import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  dark = false,
}: {
  children: ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      className={`rounded-3xl border p-6 sm:p-7 ${
        dark
          ? "border-ink-navy bg-ink-navy text-white/85"
          : "border-app-line bg-app-card text-ink-navy shadow-[0_28px_70px_-64px_rgba(20,40,70,0.7)]"
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[0.62rem] tracking-[0.24em] text-current/45 uppercase">{children}</p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="display mt-2 text-3xl font-light tracking-tight sm:text-[2.4rem]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-ink-navy/55">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export const pillClass =
  "rounded-full border border-app-line bg-app-card px-5 py-2.5 text-xs tracking-[0.14em] text-ink-navy uppercase transition-all duration-300 hover:-translate-y-0.5 hover:border-cerulean/60";

export const pillPrimaryClass =
  "rounded-full bg-ink-navy px-6 py-2.5 text-xs tracking-[0.14em] text-white uppercase transition-all duration-300 hover:-translate-y-0.5 hover:bg-cerulean";
