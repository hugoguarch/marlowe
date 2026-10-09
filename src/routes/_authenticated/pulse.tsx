import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useState } from "react";

import { Toaster } from "@/components/ui/sonner";
import { PulseProvider, usePulse } from "@/components/pulse/context";
import yIcon from "@/assets/wm-y-icon-white.svg.asset.json";
import { CHANNELS, type RangeId } from "@/lib/pulse/metrics";

export const Route = createFileRoute("/_authenticated/pulse")({
  head: () => ({
    meta: [
      { title: "Pulse — Why Media analytics" },
      { name: "description", content: "Pulse: analytics and content intelligence for Why Media clients." },
      { property: "og:title", content: "Pulse — Why Media analytics" },
      { property: "og:description", content: "Analytics and content intelligence for Why Media clients." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PulseLayout,
});

const NAV = [
  { label: "Overview", to: "/pulse" },
  { label: "Social", to: "/pulse/social" },
  { label: "Google Business", to: "/pulse/google-business" },
  { label: "Website & SEO", to: "/pulse/website" },
  { label: "AI Search", to: "/pulse/ai-search" },
  { label: "Competitors", to: "/pulse/competitors" },
  { label: "Trends & Ideas", to: "/pulse/trends" },
  { label: "News", to: "/pulse/news" },
  { label: "Reports", to: "/pulse/reports" },
  { label: "Settings / Data sources", to: "/pulse/settings" },
] as const;
const SOON = ["Script Writer", "Description Builder", "Content Pipeline & Scheduler", "Video & Generation"];

function PulseLayout() {
  const { user } = Route.useRouteContext();
  return (
    <PulseProvider userId={user.id}>
      <Shell />
      <Toaster />
    </PulseProvider>
  );
}

function Shell() {
  const { dark } = usePulse();
  const [open, setOpen] = useState(false);
  return (
    <div className={`${dark ? "pulse-dark" : ""} min-h-screen bg-p-bg font-[Helvetica_Neue,Helvetica,Arial,sans-serif] text-p-text`}>
      <div className="flex min-h-screen">
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-p-ink text-white transition-transform lg:static lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
        >
          <div className="flex h-full flex-col px-4 py-6">
            <Link to="/pulse" className="flex items-center gap-3 px-2" onClick={() => setOpen(false)}>
              <img src={yIcon.url} alt="Why Media" className="h-7 w-auto" />
              <span className="text-base font-light tracking-wide">Pulse</span>
            </Link>
            <nav className="mt-8 flex-1 space-y-0.5 overflow-y-auto">
              {NAV.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  onClick={() => setOpen(false)}
                  activeOptions={{ exact: n.to === "/pulse" }}
                  className="block rounded-lg px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  activeProps={{ className: "!bg-p-sun !text-p-ink font-medium" }}
                >
                  {n.label}
                </Link>
              ))}
              <div className="px-3 pb-1 pt-6 text-[10px] uppercase tracking-wider text-white/40">Coming in Marlow</div>
              {SOON.map((s) => (
                <div key={s} className="cursor-not-allowed px-3 py-2 text-sm text-white/30">
                  {s}
                </div>
              ))}
            </nav>
            <Link to="/app" className="px-3 text-xs text-white/50 hover:text-white">
              Back to Marlowe workspace
            </Link>
          </div>
        </aside>
        {open && <div className="fixed inset-0 z-30 bg-p-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
        <div className="min-w-0 flex-1">
          <TopBar onMenu={() => setOpen(true)} />
          <main className="px-4 py-6 sm:px-8 lg:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { channel, setChannel, connected, clientId, range, setRange, dark, setDark, sites, site, setSite } = usePulse();
  const [custom, setCustom] = useState({ from: range.from, to: range.to });
  const ranges: RangeId[] = ["7d", "28d", "90d", "12m", "custom"];
  const chans = CHANNELS.filter((c) => c.id === "all" || clientId === "all" || connected.includes(c.id));
  return (
    <header className="sticky top-0 z-20 border-b border-p-line bg-p-bg/90 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-8">
        <button onClick={onMenu} className="rounded-lg border border-p-line px-3 py-2 text-xs lg:hidden">
          Menu
        </button>
        <ClientSwitcher />
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          className="h-9 rounded-lg border border-p-line bg-p-card px-3 text-sm text-p-text"
          aria-label="Channel"
        >
          {chans.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
        {clientId !== "all" && sites.length > 1 && (
          <select
            value={site ?? ""}
            onChange={(e) => setSite(e.target.value || null)}
            className="h-9 max-w-[14rem] rounded-lg border border-p-line bg-p-card px-3 text-sm text-p-text"
            aria-label="Website"
          >
            <option value="">All websites ({sites.length})</option>
            {sites.map((s) => (
              <option key={s} value={s}>{s.replace(/^sc-domain:/, "").replace(/^https?:\/\//, "").replace(/\/$/, "")}</option>
            ))}
          </select>
        )}
        <div className="flex rounded-lg border border-p-line bg-p-card p-0.5">
          {ranges.map((r) => (
            <button
              key={r}
              onClick={() => (r === "custom" ? setRange("custom", custom) : setRange(r))}
              className={`rounded-md px-2.5 py-1.5 text-xs uppercase ${range.id === r ? "bg-p-cerulean text-white" : "text-p-muted hover:text-p-text"}`}
            >
              {r}
            </button>
          ))}
        </div>
        {range.id === "custom" && (
          <div className="flex items-center gap-1 text-xs">
            <input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} className="h-9 rounded-lg border border-p-line bg-p-card px-2 text-p-text" />
            <input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} className="h-9 rounded-lg border border-p-line bg-p-card px-2 text-p-text" />
            <button onClick={() => setRange("custom", custom)} className="h-9 rounded-lg bg-p-ink px-3 text-white">
              Apply
            </button>
          </div>
        )}
        <button
          onClick={() => setDark(!dark)}
          className="ml-auto h-9 rounded-lg border border-p-line bg-p-card px-3 text-xs text-p-muted"
        >
          {dark ? "Light" : "Dark"}
        </button>
      </div>
    </header>
  );
}

function ClientSwitcher() {
  const { session, clientId, setClientId, client } = usePulse();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const list = (session?.clients ?? []).filter(
    (c) => c.status !== "archived" && `${c.name} ${c.sector}`.toLowerCase().includes(q.toLowerCase()),
  );
  const label = clientId === "all" ? "All clients" : (client?.name ?? "Choose client");
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-9 min-w-52 items-center justify-between gap-3 rounded-lg border border-p-line bg-p-card px-3 text-sm"
      >
        <span className="flex items-center gap-2">
          <Avatar name={label} />
          {label}
        </span>
        <span className="text-p-muted">▾</span>
      </button>
      {open && (
        <div className="absolute left-0 top-11 z-50 w-72 rounded-xl border border-p-line bg-p-card p-2 shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search clients"
            className="mb-2 h-9 w-full rounded-lg border border-p-line bg-p-bg px-3 text-sm text-p-text"
          />
          <div className="max-h-80 overflow-y-auto">
            {session?.role === "admin" && (
              <Item active={clientId === "all"} onClick={() => { setClientId("all"); setOpen(false); }} name="All clients" sector="Portfolio league table" />
            )}
            {list.map((c) => (
              <Item key={c.id} active={c.id === clientId} onClick={() => { setClientId(c.id); setOpen(false); }} name={c.name} sector={c.sector ?? ""} logo={c.logo_url} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Item({ name, sector, logo, active, onClick }: { name: string; sector: string; logo?: string | null; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left ${active ? "bg-p-soft" : "hover:bg-p-soft/60"}`}>
      {logo ? <img src={logo} alt="" className="h-7 w-7 rounded-full object-cover" /> : <Avatar name={name} />}
      <span>
        <span className="block text-sm text-p-text">{name}</span>
        <span className="block text-[11px] text-p-muted">{sector}</span>
      </span>
    </button>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-p-ink text-[10px] font-medium text-p-sun">
      {name.slice(0, 1)}
    </span>
  );
}
