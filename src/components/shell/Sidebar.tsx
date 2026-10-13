import { Link, useRouterState } from "@tanstack/react-router";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import wordmark from "@/assets/wm-whymedia-wordmark-white.png.asset.json";
import yIcon from "@/assets/wm-y-icon-white.svg.asset.json";
import { usePulse } from "@/components/pulse/context";
import { BOTTOM, DEPTS, TOP } from "./nav";
import { FadedMark } from "./ui";

const ON = "bg-white/[0.08] text-white";
const DIM = "text-white/70 hover:text-white hover:bg-white/[0.04]";

const initials = (s: string) =>
  s.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();

export function Sidebar({ name, role, onSignOut }: { name: string; role: string; onSignOut: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const active = DEPTS.find((d) => path.startsWith(d.base))?.key ?? null;
  const [open, setOpen] = useState<string | null>(active);
  useEffect(() => { setOpen(active); }, [active]);

  return (
    <aside className="relative sticky top-0 flex h-screen w-[68px] shrink-0 flex-col overflow-hidden bg-ink-navy px-2.5 pt-[22px] pb-4 text-white xl:w-[248px] xl:px-3.5">
      <FadedMark size={520} className="!-right-[60%] !-bottom-[20%]" />
      <Link to="/dashboard" className="relative flex items-center gap-2.5 px-2 pb-5">
        <img src={yIcon.url} alt="Why Media" className="h-[26px] w-auto" />
        <img src={wordmark.url} alt="" className="hidden h-[15px] w-auto xl:block" />
        <span className="ml-auto hidden text-[10px] font-bold tracking-[0.18em] text-cerulean-300 xl:block">AI</span>
      </Link>

      <AccountSwitcher />

      <nav className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {TOP.map((t) => (
            <Link key={t.to} to={t.to} title={t.label} className={`flex items-center gap-[11px] rounded-[6px] px-2.5 py-[9px] text-sm transition-colors duration-150 ${path.startsWith(t.to) ? ON : DIM}`}>
              <t.icon size={17} strokeWidth={1.75} className="shrink-0" />
              <span className="hidden xl:inline">{t.label}</span>
            </Link>
          ))}
        </div>
        <p className="hidden px-2.5 pt-[22px] pb-2 text-[10.5px] font-bold tracking-[0.2em] text-white/45 xl:block">DEPARTMENTS</p>
        <div className="mt-4 flex flex-col gap-0.5 xl:mt-0">
          {DEPTS.map((d) => {
            const isOpen = open === d.key;
            return (
              <div key={d.key} className="flex flex-col">
                {/* Collapsed rail: icon goes to the department's first page */}
                <Link to={d.items[0]!.to} title={d.label} className={`flex items-center rounded-[6px] px-2.5 py-[9px] xl:hidden ${active === d.key ? ON : DIM}`}>
                  <d.icon size={17} strokeWidth={1.75} />
                </Link>
                <button
                  onClick={() => setOpen(isOpen ? null : d.key)}
                  aria-expanded={isOpen}
                  className={`hidden items-center gap-[11px] rounded-[6px] px-2.5 py-[9px] text-left text-sm transition-colors duration-150 xl:flex ${isOpen || active === d.key ? "text-white" : DIM}`}
                >
                  <d.icon size={17} strokeWidth={1.75} />
                  <span className="flex-1">{d.label}</span>
                  {isOpen ? <ChevronDown size={14} className="text-white/45" /> : <ChevronRight size={14} className="text-white/45" />}
                </button>
                {isOpen ? (
                  <div className="wm-fade mt-1 mb-1.5 ml-[18px] hidden flex-col border-l border-hair-dark pl-3 xl:flex">
                    {d.items.map((i) => {
                      const on = path === i.to || path.startsWith(i.to + "/");
                      return (
                        <Link key={i.to} to={i.to} className={`rounded-[5px] px-2.5 py-1.5 text-[13px] transition-colors duration-150 ${on ? ON : "text-white/60 hover:text-white"}`}>
                          {i.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      <div className="relative mt-3 flex flex-col gap-0.5">
        {BOTTOM.map((b) => (
          <Link key={b.to} to={b.to} title={b.label} className={`flex items-center gap-[11px] rounded-[6px] px-2.5 py-[9px] text-sm transition-colors duration-150 ${path.startsWith(b.to) ? ON : DIM}`}>
            <b.icon size={17} strokeWidth={1.75} />
            <span className="hidden xl:inline">{b.label}</span>
          </Link>
        ))}
        <div className="mt-2 flex items-center gap-2.5 border-t border-hair-dark px-1.5 pt-3 xl:px-2.5">
          <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-cerulean text-[11px] font-bold">{initials(name || "?")}</span>
          <div className="hidden min-w-0 flex-1 xl:block">
            <p className="truncate text-[13px] font-medium">{name}</p>
            <p className="truncate text-[11.5px] text-wm-grey-3">{role}</p>
          </div>
          <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="hidden text-white/50 transition-colors hover:text-white xl:block">
            <LogOut size={15} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function AccountSwitcher() {
  const { session, clientId, setClientId, client } = usePulse();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const clients = (session?.clients ?? []).filter((c) => c.status !== "archived");
  const multi = session?.role === "admin" || clients.length > 1;
  const label = clientId === "all" ? "All accounts" : (client?.name ?? "Loading…");
  const list = clients.filter((c) => `${c.name} ${c.sector ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div ref={ref} className="relative mb-[22px]">
      <button
        onClick={() => multi && setOpen(!open)}
        className="flex w-full items-center gap-2.5 rounded-[8px] border border-hair-dark bg-wm-teal p-1.5 text-left xl:p-2.5"
        aria-haspopup={multi ? "listbox" : undefined}
      >
        <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[6px] bg-white text-[11px] font-bold text-ink-navy">
          {clientId === "all" ? "WM" : initials(label)}
        </span>
        <span className="hidden min-w-0 flex-1 xl:block">
          <span className="block truncate text-[13.5px] font-medium">{label}</span>
          <span className="block truncate text-[11.5px] text-wm-grey-3">
            {multi ? `Why Media · ${clients.length} accounts` : (client?.sector ?? "Your account")}
          </span>
        </span>
        {multi ? <ChevronsUpDown size={15} className="hidden text-wm-grey-3 xl:block" /> : null}
      </button>
      {open ? (
        <div className="wm-fade absolute top-full left-0 z-50 mt-1.5 w-[260px] rounded-[8px] border border-app-line bg-app-card p-1.5 text-ink-navy shadow-[0_24px_60px_rgba(0,28,38,0.18)]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search accounts"
            className="mb-1.5 h-9 w-full rounded-[6px] border border-app-line bg-app-bg px-3 text-[13px] outline-none"
          />
          <div className="max-h-72 overflow-y-auto">
            {session?.role === "admin" ? (
              <Row on={clientId === "all"} name="All accounts" sub="Portfolio view" onClick={() => { setClientId("all"); setOpen(false); }} />
            ) : null}
            {list.map((c) => (
              <Row key={c.id} on={c.id === clientId} name={c.name} sub={c.sector ?? ""} onClick={() => { setClientId(c.id); setOpen(false); }} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ name, sub, on, onClick }: { name: string; sub: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-2.5 rounded-[6px] px-2 py-2 text-left ${on ? "bg-app-bg" : "hover:bg-app-bg"}`}>
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[6px] bg-ink-navy text-[10px] font-bold text-white">{initials(name)}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px]">{name}</span>
        <span className="block truncate text-[11px] text-ink-navy/50">{sub}</span>
      </span>
      {on ? <Check size={14} className="text-cerulean" /> : null}
    </button>
  );
}
