import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import demoFilm from "@/assets/marlowe-demo-film.mp4.asset.json";
import demoThumb from "@/assets/marlowe-demo-thumb.jpg.asset.json";
import { briefBody, briefSummary, channelWork, toneClass } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Morning brief — Why Media AI" },
      { name: "description", content: "Marlowe's morning brief: what it noticed, prepared and moved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BriefPage,
});

function BriefPage() {
  const { user } = Route.useRouteContext();
  const [approved, setApproved] = useState(false);
  const name = (user.email?.split("@")[0] ?? "there").replace(/[._-]/g, " ");
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow={today}
        title={`Good morning, ${name.charAt(0).toUpperCase()}${name.slice(1)}`}
        subtitle="Marlowe has already been working. Here is the night, in short."
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardLabel>This morning's film</CardLabel>
          <div className="mt-4 overflow-hidden rounded-2xl border border-app-line">
            <video
              controls
              poster={demoThumb.url}
              src={demoFilm.url}
              className="aspect-video w-full bg-ink-navy object-cover"
            />
          </div>
          <p className="mt-4 text-xs text-ink-navy/45">
            Ninety seconds. Marlowe walks you through the decisions it made.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardLabel>The written brief</CardLabel>
          <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-navy/75">
            {briefBody.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {briefSummary.map((group) => (
          <Card key={group.heading}>
            <CardLabel>{group.heading}</CardLabel>
            <ul className="mt-4 space-y-4">
              {group.items.map((item) => (
                <li key={item.label}>
                  <p className="text-sm text-ink-navy">{item.label}</p>
                  <p className="mt-0.5 text-xs text-ink-navy/50">{item.detail}</p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      <Card>
        <CardLabel>Working across your channels</CardLabel>
        <ul className="mt-4 divide-y divide-app-line">
          {channelWork.map((c) => (
            <li key={c.channel} className="flex items-center gap-4 py-3">
              <span className={`h-2 w-2 shrink-0 rounded-full ${toneClass[c.tone]}`} />
              <span className="w-40 shrink-0 text-sm text-ink-navy">{c.channel}</span>
              <span className="text-sm text-ink-navy/55">{c.state}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-full border border-app-line bg-app-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => setApproved(true)} className={pillPrimaryClass}>
          {approved ? "Approved — shipping" : "Approve everything"}
        </button>
        <button className={pillClass}>Review one by one</button>
        <button className={pillClass}>Hold the price response</button>
        <button className={pillClass}>Ask Marlowe</button>
      </div>
    </div>
  );
}
