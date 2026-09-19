import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Card, CardLabel, PageHeader, pillPrimaryClass } from "@/components/app/ui";
import demoFilm from "@/assets/marlowe-demo-film.mp4.asset.json";
import demoThumb from "@/assets/marlowe-demo-thumb.jpg.asset.json";
import { approveQueue, generateBrief } from "@/lib/marlowe.functions";
import {
  briefBody as seedBody,
  briefSummary as seedSummary,
  channelWork as seedChannels,
  toneClass,
} from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Why Media AI" },
      { name: "description", content: "Marlowe's morning brief: what it noticed, prepared and moved." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = Route.useRouteContext();
  const [approved, setApproved] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [briefBody, setBriefBody] = useState<string[]>(seedBody);
  const [briefSummary, setBriefSummary] = useState(seedSummary);
  const [channelWork, setChannelWork] = useState<{ channel: string; state: string; tone: string }[]>(
    seedChannels.map((c) => ({ ...c })),
  );
  const brief = useServerFn(generateBrief);
  const approve = useServerFn(approveQueue);

  useEffect(() => {
    let cancelled = false;
    brief()
      .then((d) => {
        if (cancelled) return;
        setBriefBody(d.body);
        setBriefSummary(d.summary);
        setChannelWork(d.channels);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [brief]);

  const name = (user.email?.split("@")[0] ?? "there").replace(/[._-]/g, " ");
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  async function approveAll() {
    setBusy(true);
    try {
      const { approved: count } = await approve();
      setApproved(count);
    } catch {
      setApproved(0);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow={today}
        title={`Good morning, ${name.charAt(0).toUpperCase()}${name.slice(1)}`}
        subtitle="Marlowe has already been working. Here is the night, in short."
      />

      <Card>
        <CardLabel>This morning's brief</CardLabel>
        <div className="mt-4 overflow-hidden rounded-2xl border border-app-line">
          <video
            controls
            poster={demoThumb.url}
            src={demoFilm.url}
            className="aspect-video w-full bg-ink-navy object-cover"
          />
        </div>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-ink-navy/75">
          {briefBody.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {briefSummary.map((group) => (
          <Card key={group.heading} className="p-5">
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

      <div className="sticky bottom-4 flex flex-wrap items-center gap-4 rounded-full border border-app-line bg-app-card/95 px-4 py-3 backdrop-blur">
        <button onClick={approveAll} className={pillPrimaryClass} disabled={busy}>
          {busy ? "Approving…" : "Approve everything"}
        </button>
        {approved !== null ? (
          <span className="text-xs text-ink-navy/55">
            {approved > 0
              ? `${approved} item${approved === 1 ? "" : "s"} approved.`
              : "Nothing was waiting for approval."}
          </span>
        ) : null}
      </div>
    </div>
  );
}
