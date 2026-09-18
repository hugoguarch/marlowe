import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { Sphere } from "./Sphere";
import { supabase } from "@/integrations/supabase/client";

const nav = [
  { label: "Brief", to: "/app" as const },
  { label: "Marlowe", to: "/app/marlowe" as const },
  { label: "Brand", to: "/app/brand" as const },
  { label: "Studio", to: "/app/studio" as const },
  { label: "Growth", to: "/app/growth" as const },
];

export function AppSidebar({
  name,
  email,
  autonomy,
}: {
  name: string;
  email: string;
  autonomy: string;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const body = (
    <div className="flex h-full flex-col justify-between px-5 py-6">
      <div>
        <Link to="/app" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <Sphere size={32} />
          <span className="text-sm font-medium tracking-tight text-ink-navy">Why Media AI</span>
        </Link>

        <nav className="mt-10 flex flex-col gap-1">
          {nav.map((item) => {
            const active =
              item.to === "/app" ? pathname === "/app" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 ${
                  active
                    ? "bg-ink-navy text-white"
                    : "text-ink-navy/65 hover:bg-app-bg hover:text-ink-navy"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-8 border-t border-app-line pt-4">
          <Link
            to="/app/settings"
            onClick={() => setOpen(false)}
            className={`block rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 ${
              pathname.startsWith("/app/settings")
                ? "bg-ink-navy text-white"
                : "text-ink-navy/55 hover:bg-app-bg hover:text-ink-navy"
            }`}
          >
            Settings
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-app-line bg-app-bg/70 p-4">
        <p className="truncate text-sm text-ink-navy">{name}</p>
        <p className="truncate text-xs text-ink-navy/45">{email}</p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-card px-3 py-1 text-[0.6rem] tracking-[0.18em] text-ink-navy/65 uppercase">
          <span className="h-1.5 w-1.5 rounded-full bg-gold" />
          Autonomy — {autonomy}
        </p>
        <button
          onClick={signOut}
          className="mt-4 text-[0.62rem] tracking-[0.2em] text-ink-navy/45 uppercase transition-colors hover:text-ink-navy"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile bar */}
      <div className="flex items-center justify-between border-b border-app-line bg-app-card px-5 py-4 lg:hidden">
        <Link to="/app" className="flex items-center gap-2.5">
          <Sphere size={26} />
          <span className="text-sm tracking-tight text-ink-navy">Why Media AI</span>
        </Link>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
          className="rounded-full border border-app-line px-4 py-2 text-[0.62rem] tracking-[0.18em] text-ink-navy uppercase"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div className="border-b border-app-line bg-app-card lg:hidden">{body}</div>
      ) : null}

      <aside className="hidden w-64 shrink-0 border-r border-app-line bg-app-card lg:sticky lg:top-0 lg:block lg:h-screen">
        {body}
      </aside>
    </>
  );
}
