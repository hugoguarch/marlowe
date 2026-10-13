import { useNavigate } from "@tanstack/react-router";
import { FileText, Film, Globe, Image, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { usePulse } from "@/components/pulse/context";

// TODO: wire to API — the plan should come from the agent planner once it exists.
function planFor(q: string) {
  const topic = q.trim() || "your request";
  return [
    { icon: FileText, label: `Draft a content plan for "${topic}"`, dept: "Marketing" },
    { icon: Image, label: "Design social stills on the account's brand kit", dept: "Design" },
    { icon: Film, label: "Cut a short video from the latest footage", dept: "Video" },
    { icon: Globe, label: "Publish a landing page and supporting articles", dept: "Web" },
  ];
}

/** Header ⌘K agent bar — the single global AI entry point. */
export function AgentBar({ open, setOpen }: { open: boolean; setOpen: (v: boolean) => void }) {
  const { client, clientId } = usePulse();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const steps = planFor(q);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      } else if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, setOpen]);

  useEffect(() => {
    if (open) setTimeout(() => input.current?.focus(), 0);
  }, [open]);

  function run() {
    setOpen(false);
    navigate({ to: "/agent", search: { q: q.trim() || undefined } as never });
    setQ("");
  }

  const where = clientId === "all" ? "All accounts" : (client?.name ?? "");

  return (
    <div className="relative mx-auto w-full max-w-[520px] min-w-0">
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 w-full items-center gap-3 rounded-full bg-ink-navy py-1 pr-1.5 pl-4 text-left text-white transition-colors duration-150 hover:bg-wm-teal"
      >
        <Sparkles size={15} strokeWidth={1.75} className="shrink-0 text-cerulean-300" />
        <span className="flex-1 truncate text-[13px] text-wm-grey-3">Ask Why AI to do anything…</span>
        <span className="rounded-full bg-white/[0.12] px-2 py-0.5 text-[11px] font-medium">⌘K</span>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="wm-fade absolute top-[-6px] left-1/2 z-50 w-[min(640px,90vw)] -translate-x-1/2 overflow-hidden rounded-[10px] bg-ink-navy text-white shadow-[0_24px_60px_rgba(0,28,38,0.35)]">
            <div className="flex items-center gap-3 border-b border-hair-dark px-[18px] py-4">
              <Sparkles size={18} strokeWidth={1.75} className="text-cerulean-300" />
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") run();
                  if (e.key === "Tab") { e.preventDefault(); setSel((s) => (s + 1) % steps.length); }
                }}
                placeholder="Ask Why AI to do anything…"
                className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-white/40"
                aria-label="Ask the agent"
              />
              <span className="rounded-[4px] border border-hair-dark px-1.5 py-0.5 text-[10.5px] text-wm-grey-3">ESC</span>
            </div>
            <div className="px-2 pt-2.5 pb-2">
              <p className="px-2.5 pt-1.5 pb-2 text-[10.5px] font-bold tracking-[0.2em] text-white/45">AGENT WILL</p>
              {steps.map((s, i) => (
                <div key={s.label} className={`flex items-center gap-3 rounded-[6px] px-2.5 py-[9px] text-[13.5px] ${i === sel ? "bg-white/[0.08]" : ""}`}>
                  <s.icon size={16} strokeWidth={1.75} className="text-wm-grey-3" />
                  <span className="flex-1 truncate">{s.label}</span>
                  <span className="text-[11.5px] text-wm-grey-3">{s.dept}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-5 border-t border-hair-dark px-[18px] py-3 text-[12px] text-wm-grey-3">
              <button onClick={run}>↵ Run</button>
              <span>⇥ Edit plan</span>
              <span className="ml-auto">Working in {where}</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
