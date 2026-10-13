import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import dusk from "@/assets/wm-london-city-dusk.jpg.asset.json";
import veroLogo from "@/assets/wm-logo-color.png.asset.json";
import { PreviewTag } from "@/components/shell/Preview";
import { Badge, btnDark, btnGhost, CardHead, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/marketing/email")({
  head: () => ({
    meta: [
      { title: "Email Marketing — Why Media AI" },
      { name: "description", content: "Campaigns, automations and results for each account's email list." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmailPage,
});

// TODO: wire to API — email provider not connected yet.
const LIST = [
  ["Funding Friday — Southwark bridge", "SENT", "4,180 sent · 46.2% open"],
  ["Funding Friday — Manchester BTL", "DRAFT", "Written by agent · needs review"],
  ["Q4 rates update", "SCHEDULED", "Tue 20 Oct, 08:00 · 6,020"],
  ["New enquiry nurture (5)", "LIVE", "Automation · 148 in flow"],
  ["Development finance guide", "SENT", "5,340 sent · 39.8% open"],
] as const;
const TONE = { SENT: "green", DRAFT: "muted", SCHEDULED: "cerulean", LIVE: "ink" } as const;
const KPIS = [["Open rate", "46.2%", "Sector avg. 21%"], ["Click rate", "7.4%", "309 unique"], ["Enquiries", "23", "From this send"], ["Unsubscribes", "0.2%", "8 contacts"]];

function EmailPage() {
  const [sel, setSel] = useState(0);
  return (
    <div className="space-y-6">
      <Title title="Email Marketing" sub="Campaigns and automations" action={<div className="flex gap-2"><PreviewTag /><button className={btnDark}>New campaign</button></div>} />
      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <WmCard>
          <CardHead title="Campaigns" />
          {LIST.map(([n, s, m], i) => (
            <button key={n} onClick={() => setSel(i)} className={`flex w-full items-center gap-3 border-b border-l-2 border-b-app-line px-4 py-3 text-left last:border-b-0 ${i === sel ? "border-l-cerulean bg-app-bg" : "border-l-transparent"}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px]">{n}</p>
                <p className="truncate text-[12px] text-ink-navy/55">{m}</p>
              </div>
              <Badge tone={TONE[s]}>{s.toLowerCase()}</Badge>
            </button>
          ))}
        </WmCard>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
            {KPIS.map(([l, v, d]) => (
              <WmCard key={l} className="p-5">
                <p className="text-[13px] text-ink-navy/60">{l}</p>
                <p className="mt-2 text-[30px] leading-none font-light tracking-[-0.02em]">{v}</p>
                <p className="mt-2 text-[12px] text-ink-navy/55">{d}</p>
              </WmCard>
            ))}
          </div>
          <WmCard>
            <CardHead title={LIST[sel]![0]} action={<div className="flex gap-2"><button className={btnGhost}>Edit</button><button className={btnDark}>Duplicate</button></div>} />
            {/* Client email preview: uses the account's own brand kit, not Why Media's. */}
            <div className="bg-app-bg p-6">
              <div className="mx-auto max-w-[520px] overflow-hidden rounded-[6px] bg-[var(--vero-paper)] shadow-[0_12px_30px_rgba(0,28,38,0.12)]" style={{ ["--vero-paper" as string]: "#ffffff", fontFamily: "Georgia, serif" }}>
                <div className="px-6 py-4"><img src={veroLogo.url} alt="Vero Finance" className="h-7 w-auto" /></div>
                <img src={dusk.url} alt="" className="aspect-[16/8] w-full object-cover" />
                <div className="space-y-3 px-6 py-5 text-[14px]" style={{ color: "#16301f" }}>
                  <p className="text-[22px] leading-tight">A £4.2M bridge, completed in 9 days</p>
                  <p className="leading-relaxed opacity-80">How we helped a Southwark developer beat an auction deadline — and what it means for your next deal.</p>
                  <span className="inline-block px-4 py-2 text-[13px]" style={{ background: "#1e5631", color: "#fff" }}>Speak to an Expert</span>
                </div>
              </div>
            </div>
          </WmCard>
        </div>
      </div>
    </div>
  );
}
