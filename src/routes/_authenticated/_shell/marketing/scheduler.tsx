import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { BrandSwitcher } from "@/components/app/BrandSwitcher";
import { MonthCalendar, type CalendarItem } from "@/components/app/MonthCalendar";
import { PostDesign, templates, type DesignTokens } from "@/components/app/PostDesign";
import { PostModal, type PostView } from "@/components/app/PostModal";
import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { useSelectedBrandId } from "@/lib/brandSelection";
import { getBrandBrain, type BrandBrain } from "@/lib/brand.functions";
import {
  generatePost,
  getSchedule,
  listPosts,
  queuePost,
  removeScheduleItem,
  rescheduleItem,
  type PostCopy,
} from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/_shell/marketing/scheduler")({
  head: () => ({
    meta: [
      { title: "Studio — Why Media AI" },
      { name: "description", content: "Generate on-brand post designs and send them to the queue." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

const channelOptions = ["Instagram", "Facebook", "LinkedIn", "TikTok", "Google Business"];

type ScheduleRow = {
  id: string;
  title: string;
  channel: string;
  scheduled_for: string;
  status: string;
  caption: string | null;
  template: string | null;
  imageUrl: string | null;
};

function tokensFrom(brain: BrandBrain | null): DesignTokens {
  const hex = (i: number, fallback: string) => brain?.palette?.[i]?.hex || fallback;
  return {
    name: brain?.name ?? "Your brand",
    logoUrl: brain?.logoUrl ?? null,
    ink: hex(0, "#0E2033"),
    accent: hex(1, "#2E7DD1"),
    light: "#FFFFFF",
    headlineFont: brain?.typography?.headline || '"Helvetica Neue", Helvetica, sans-serif',
    bodyFont: brain?.typography?.body || '"Helvetica Neue", Helvetica, sans-serif',
  };
}

function StudioPage() {
  const [tab, setTab] = useState<"create" | "calendar">("create");
  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<string>("carousel");
  const [topic, setTopic] = useState("");
  const [copy, setCopy] = useState<PostCopy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [bankPath, setBankPath] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [channels, setChannels] = useState<string[]>(["Instagram"]);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [open, setOpen] = useState<PostView | null>(null);

  const { brandId, ready } = useSelectedBrandId();
  const loadBrain = useServerFn(getBrandBrain);
  const make = useServerFn(generatePost);
  const queue = useServerFn(queuePost);
  const loadSchedule = useServerFn(getSchedule);
  const loadPosts = useServerFn(listPosts);
  const move = useServerFn(rescheduleItem);
  const drop = useServerFn(removeScheduleItem);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadBrain({ data: brandId ? { brandId } : {} })
      .then(async (b) => {
        setBrain(b);
        if (b) {
          setSchedule((await loadSchedule({ data: { brandId: b.brandId } })) as ScheduleRow[]);
          setPosts(await loadPosts({ data: { brandId: b.brandId } }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, brandId, loadBrain, loadSchedule, loadPosts]);

  const tokens = useMemo(() => tokensFrom(brain), [brain]);
  const slides = copy?.slides ?? [];
  const active = slides[slide] ?? slides[0];
  const bank = (brain?.assets ?? []).filter((a) => a.kind === "image" && a.url);

  const calendarItems: CalendarItem[] = schedule.map((s) => ({
    id: s.id,
    title: s.title,
    channel: s.channel,
    when: s.scheduled_for,
    status: s.status,
  }));

  async function refresh(id: string) {
    setSchedule((await loadSchedule({ data: { brandId: id } })) as ScheduleRow[]);
    setPosts(await loadPosts({ data: { brandId: id } }));
  }

  async function generate() {
    if (!brain) return;
    setBusy(true);
    setError(null);
    setQueued(false);
    try {
      const result = await make({
        data: { brandId: brain.brandId, template, topic, imagePath: bankPath },
      });
      setCopy(result.copy);
      setImageUrl(result.imageUrl);
      setImagePath(result.imagePath);
      setSlide(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Marlowe couldn't build that post.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!brain || !copy) return;
    setBusy(true);
    setError(null);
    try {
      await queue({
        data: {
          brandId: brain.brandId,
          template,
          title: copy.headline,
          caption: copy.caption,
          slides: copy.slides,
          channels,
          imagePath,
        },
      });
      setQueued(true);
      await refresh(brain.brandId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that to the queue.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <p className="text-sm text-ink-navy/45">Opening the studio…</p>
        </Card>
      </div>
    );
  }

  if (!brain) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="Post Scheduler" title="Make your first brand first" />
        <Card>
          <p className="text-sm leading-relaxed text-ink-navy/60">
            The Studio designs in your brand's colours, fonts and voice — so it needs a Brand Brain
            before it can make anything.
          </p>
          <Link to="/design/brand" className={`${pillPrimaryClass} mt-5 inline-block`}>
            Create a Brand Brain
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="Post Scheduler"
        title="Make something on brand"
        subtitle={`Designed with ${brain.name}'s colours, type and voice.`}
        action={
          <div className="flex flex-wrap items-center gap-3">
            <BrandSwitcher current={brain.brandId} />
            <div className="flex gap-1 rounded-full border border-app-line bg-app-card p-1">
              {(["create", "calendar"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-full px-5 py-2 text-[0.62rem] tracking-[0.14em] uppercase transition-colors ${
                    tab === t ? "bg-ink-navy text-white" : "text-ink-navy/55 hover:text-ink-navy"
                  }`}
                >
                  {t === "create" ? "Create" : "Calendar"}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {tab === "create" ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,360px)_1fr]">
          <div className="space-y-4">
            <PostDesign
              template={template}
              tokens={tokens}
              imageUrl={imageUrl}
              content={{
                headline: active?.title || copy?.headline || "Your headline lands here",
                subhead: active?.caption || copy?.subhead || "And the supporting line sits under it.",
              }}
            />
            {slides.length > 1 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {slides.map((s, i) => (
                  <button
                    key={`${s.title}-${i}`}
                    onClick={() => setSlide(i)}
                    className={`h-20 w-16 shrink-0 rounded-[8px] border px-2 py-2 text-left text-[0.58rem] leading-snug transition-all ${
                      i === slide
                        ? "border-cerulean bg-cerulean/10 text-ink-navy"
                        : "border-app-line bg-app-card text-ink-navy/55"
                    }`}
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <Card>
            <CardLabel>Brief Marlowe</CardLabel>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              rows={3}
              placeholder="What is this post about? Leave it blank and Marlowe decides."
              className="mt-3 w-full rounded-[8px] border border-app-line bg-app-bg/60 px-4 py-3 text-sm text-ink-navy outline-none focus:border-cerulean"
            />

            <p className="mt-5 text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
              Format
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`rounded-full border px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all ${
                    template === t.id
                      ? "border-ink-navy bg-ink-navy text-white"
                      : "border-app-line bg-app-card text-ink-navy/65"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="mt-6 text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
              Picture
            </p>
            {bank.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => setBankPath(null)}
                  className={`h-16 w-16 rounded-[8px] border text-[0.55rem] leading-tight ${
                    bankPath === null
                      ? "border-ink-navy bg-ink-navy text-white"
                      : "border-app-line bg-app-card text-ink-navy/55"
                  }`}
                >
                  Marlowe makes one
                </button>
                {bank.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setBankPath(a.file_path)}
                    className={`h-16 w-16 overflow-hidden rounded-[8px] border ${
                      bankPath === a.file_path ? "border-cerulean" : "border-app-line"
                    }`}
                  >
                    <img src={a.url!} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-ink-navy/45">
                Marlowe will generate the artwork. Upload your own to the image bank on the{" "}
                <Link to="/design/brand" className="text-cerulean">
                  Brand page
                </Link>{" "}
                to use your photography instead.
              </p>
            )}

            <button onClick={generate} className={`${pillPrimaryClass} mt-6`} disabled={busy}>
              {busy ? "Marlowe is making it…" : copy ? "Generate again" : "Generate post"}
            </button>

            {copy ? (
              <>
                <p className="mt-7 text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
                  Caption
                </p>
                <textarea
                  value={copy.caption}
                  onChange={(e) => setCopy({ ...copy, caption: e.target.value })}
                  rows={4}
                  className="mt-3 w-full rounded-[8px] border border-app-line bg-app-bg/60 px-4 py-3 text-sm leading-relaxed text-ink-navy outline-none focus:border-cerulean"
                />
                {copy.hashtags?.length ? (
                  <p className="mt-2 text-xs text-cerulean">
                    {copy.hashtags.map((h) => `#${h.replace(/^#/, "")}`).join(" ")}
                  </p>
                ) : null}

                <p className="mt-6 text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
                  Schedule to
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {channelOptions.map((c) => (
                    <button
                      key={c}
                      onClick={() =>
                        setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))
                      }
                      className={`rounded-full border px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all ${
                        channels.includes(c)
                          ? "border-ink-navy bg-ink-navy text-white"
                          : "border-app-line bg-app-card text-ink-navy/65"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>

                <button
                  onClick={send}
                  className={`${pillClass} mt-6`}
                  disabled={busy || channels.length === 0}
                >
                  {queued ? "In the queue" : "Send to queue"}
                </button>
                <p className="mt-3 text-xs text-ink-navy/45">
                  Queued posts wait here until a channel is connected.
                </p>
              </>
            ) : null}

            {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <MonthCalendar
              items={calendarItems}
              onOpen={(item) => {
                const row = schedule.find((s) => s.id === item.id);
                if (!row) return;
                setOpen({
                  id: row.id,
                  title: row.title,
                  caption: row.caption,
                  channel: row.channel,
                  status: row.status,
                  when: row.scheduled_for,
                  imageUrl: row.imageUrl,
                  template: row.template,
                  scheduleId: row.id,
                });
              }}
            />
          </Card>

          <Card>
            <CardLabel>Made so far</CardLabel>
            {posts.length === 0 ? (
              <p className="mt-4 text-sm text-ink-navy/50">No posts yet.</p>
            ) : (
              <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      setOpen({
                        id: p.id,
                        title: p.title,
                        caption: p.caption,
                        channel: p.channel,
                        status: p.status,
                        when: p.created_at,
                        imageUrl: p.imageUrl,
                        template: p.template,
                      })
                    }
                    className="text-left transition-transform duration-300 hover:-translate-y-1"
                  >
                    <PostDesign
                      compact
                      template={p.template ?? "carousel"}
                      tokens={tokens}
                      imageUrl={p.imageUrl}
                      content={{ headline: p.title }}
                    />
                    <p className="mt-2 text-xs text-ink-navy/50">
                      {p.channel} · {p.status}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {open ? (
        <PostModal
          post={open}
          tokens={tokens}
          onClose={() => setOpen(null)}
          onReschedule={async (scheduleId, when) => {
            await move({ data: { scheduleId, when } });
            await refresh(brain.brandId);
          }}
          onRemove={async (scheduleId) => {
            await drop({ data: { scheduleId } });
            await refresh(brain.brandId);
          }}
        />
      ) : null}
    </div>
  );
}
