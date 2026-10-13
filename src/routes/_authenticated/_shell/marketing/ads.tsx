import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

import { MetaAds } from "@/components/pulse/MetaAds";
import { usePulse } from "@/components/pulse/context";
import { Badge, btnGhost, btnPrimary, CardHead, EmptyState, FadedMark, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/marketing/ads")({
  head: () => ({
    meta: [
      { title: "Ad Manager — Why Media AI" },
      { name: "description", content: "Paid campaigns, spend and agent recommendations per account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdsPage,
});

// TODO: wire to API — recommendations engine.
const RECS = [
  { t: "Move budget from Search to LinkedIn", d: "Search cost per lead is above target and budget-limited. LinkedIn lead forms are converting cheaper.", i: "More leads" },
  { t: "Refresh creative on Retargeting", d: "Frequency is high and click-through dropped this week. Design has new variants ready.", i: "Higher CTR" },
];

function AdsPage() {
  const { clientId, client } = usePulse();
  return (
    <div className="space-y-6">
      <Title title="Ad Manager" sub={clientId === "all" ? "Choose an account to see its campaigns" : client?.name} />
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="pulse-embed min-w-0">
          {clientId === "all" ? <WmCard><EmptyState title="Pick an account" body="Ad data is shown one account at a time." /></WmCard> : <MetaAds />}
        </div>
        <WmCard dark className="p-5">
          <FadedMark size={300} />
          <div className="relative">
            <p className="kicker flex items-center gap-2 text-white/55"><Sparkles size={13} />Agent recommendations</p>
            <div className="mt-4 space-y-3">
              {RECS.map((r) => (
                <div key={r.t} className="rounded-[8px] border border-hair-dark p-4">
                  <p className="text-[14px] font-medium">{r.t}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-wm-grey-3">{r.d}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <Badge tone="cerulean">{r.i}</Badge>
                    <button className="ml-auto rounded-[6px] bg-white px-3 py-1.5 text-[12px] font-medium text-ink-navy">Apply</button>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11.5px] text-white/45">Preview — recommendations are not live yet.</p>
          </div>
        </WmCard>
      </div>
      <WmCard>
        <CardHead title="LinkedIn & Google Ads" action={<button className={btnGhost}>Connect</button>} />
        <EmptyState title="Not connected yet" body="Meta ads are live above. LinkedIn and Google Ads campaigns appear here once those accounts are linked." action={<Link to="/settings/data-sources" className={btnPrimary}>Open data sources</Link>} />
      </WmCard>
    </div>
  );
}
