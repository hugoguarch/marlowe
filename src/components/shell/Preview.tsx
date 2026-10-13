import type { ReactNode } from "react";
import { Sparkles } from "lucide-react";

import { Badge, FadedMark, Kicker, WmCard } from "./ui";

/** Dark agent side panel used by the design-led screens. */
export function AgentPanel({ title, steps, children }: { title: string; steps: [string, "done" | "run" | "todo"][]; children?: ReactNode }) {
  return (
    <WmCard dark className="flex flex-col p-5">
      <FadedMark size={320} />
      <div className="relative flex-1">
        <p className="kicker flex items-center gap-2 text-white/55"><Sparkles size={13} />Agent</p>
        <p className="mt-3 text-[15px] leading-snug">{title}</p>
        <ul className="mt-4 space-y-2">
          {steps.map(([s, st]) => (
            <li key={s} className="flex items-center gap-2.5 text-[13px] text-white/85">
              <span className={`h-1.5 w-1.5 rounded-full ${st === "done" ? "bg-brand-green" : st === "run" ? "bg-cerulean-300" : "bg-white/25"}`} />
              {s}
            </li>
          ))}
        </ul>
        {children}
      </div>
      <div className="relative mt-5 rounded-[8px] border border-hair-dark bg-white/[0.04] px-3 py-2.5 text-[13px] text-white/45">Ask for changes…</div>
    </WmCard>
  );
}

export function Thumb({ src, label, meta }: { src: string; label: string; meta?: string }) {
  return (
    <div className="overflow-hidden rounded-[8px] border border-app-line bg-app-card">
      <img src={src} alt="" className="aspect-[4/3] w-full object-cover" />
      <div className="px-3 py-2.5">
        <p className="truncate text-[13px]">{label}</p>
        {meta ? <p className="truncate text-[12px] text-ink-navy/55">{meta}</p> : null}
      </div>
    </div>
  );
}

export function PreviewTag() {
  return <Badge>Preview data</Badge>;
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <Kicker className="text-ink-navy/50">{children}</Kicker>;
}
