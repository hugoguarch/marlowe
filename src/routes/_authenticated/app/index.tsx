import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { BrandSwitcher } from "@/components/app/BrandSwitcher";
import { Card, CardLabel, PageHeader, pillPrimaryClass } from "@/components/app/ui";
import demoFilm from "@/assets/marlowe-demo-film.mp4.asset.json";
import demoThumb from "@/assets/marlowe-demo-thumb.jpg.asset.json";
import { useSelectedBrandId } from "@/lib/brandSelection";
import { getDashboardSummary, type DashboardSummary } from "@/lib/dashboard.functions";
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
      {
        name: "description",
        content: "Marlowe's morning brief: what it noticed, prepared and moved.",
      },
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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  const { brandId, ready } = useSelectedBrandId();
  const brief = useServerFn(generateBrief);
  const approve = useServerFn(approveQueue);
  const loadSummary = useServerFn(getDashboardSummary);

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

  useEffect(() => {
    if (!ready) return;
    loadSummary({ data: { brandId } })
      .then(setSummary)
      .catch(() => {});
  }, [ready, brandId, loadSummary]);

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

  const target = summary?.dailyTarget ?? 1;
  const postedToday = summary?.postedToday ?? 0;
  const progress = target > 0 ? Math.min(100, Math.round((postedToday / target) * 100)) : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow={today}
        title={`Good morning, ${name.charAt(0).toUpperCase()}${name.slice(1)}`}
        subtitle="Marlowe has already been working. Here is the night, in short."
        action={<BrandSwitcher current={summary?.brandId ?? null} />}
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

      <Card>
        <CardLabel>The numbers</CardLabel>
        {summary && summary.metrics.length ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {summary.metrics.map((m) => (
              <div key={m.metric} className="rounded-2xl border border-app-line bg-app-bg/60 p-5">
                <p className="text-[0.6rem] tracking-[0.2em] text-ink-navy/45 uppercase">
                  {m.metric}
                </p>
                <p className="display mt-2 text-3xl font-light tracking-tight">
                  {m.value.toLocaleString("en-GB")}
                </p>
                {m.delta !== null ? (
                  <p className="mt-1 text-xs text-ink-navy/50">
                    {m.delta >= 0 ? "+" : ""}
                    {m.delta} this week
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-relaxed text-ink-navy/55">
            No live numbers yet — connect a channel in{" "}
            <Link to="/app/settings" className="text-cerulean">
              Settings
            </Link>{" "}
            and they appear here.
          </p>
        )}
      </Card>

      <Card>
        <CardLabel>Today's output</CardLabel>
        <p className="mt-4 text-sm text-ink-navy/70">
          {postedToday} of {target} post{target === 1 ? "" : "s"} published today.
        </p>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-app-bg">
          <div
            className="h-full rounded-full bg-cerulean transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-ink-navy/45">
          Set the daily target for each brand on the Brand page.
        </p>
      </Card>

      <Card>
        <CardLabel>Published</CardLabel>
        {summary && summary.published.length ? (
          <ul className="mt-4 divide-y divide-app-line">
            {summary.published.map((p) => (
              <li key={p.id} className="flex items-center gap-4 py-3">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <span className="h-12 w-12 shrink-0 rounded-xl bg-app-bg" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-navy">{p.title}</p>
                  <p className="mt-0.5 text-xs text-ink-navy/50">
                    {p.channel} ·{" "}
                    {new Date(p.when).toLocaleString("en-GB", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-ink-navy/55">
            Nothing has gone out yet. Posts you approve are published once a channel is connected.
          </p>
        )}
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
