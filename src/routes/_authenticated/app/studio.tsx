import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";

import { PostDesign, templates, type DesignTokens } from "@/components/app/PostDesign";
import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { getBrandBrain, type BrandBrain } from "@/lib/brand.functions";
import { generatePost, getSchedule, listPosts, queuePost, type PostCopy } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/app/studio")({
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
  const [template, setTemplate] = useState<string>("carousel");
  const [topic, setTopic] = useState("");
  const [copy, setCopy] = useState<PostCopy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [channels, setChannels] = useState<string[]>(["Instagram"]);
  const [busy, setBusy] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<
    { id: string; title: string; channel: string; scheduled_for: string; status: string }[]
  >([]);
  const [posts, setPosts] = useState<any[]>([]);

  const loadBrain = useServerFn(getBrandBrain);
  const make = useServerFn(generatePost);
  const queue = useServerFn(queuePost);
  const loadSchedule = useServerFn(getSchedule);
  const loadPosts = useServerFn(listPosts);

  useEffect(() => {
    loadBrain({ data: {} })
      .then(setBrain)
      .catch(() => {});
    loadSchedule()
      .then(setSchedule)
      .catch(() => {});
    loadPosts()
      .then(setPosts)
      .catch(() => {});
  }, [loadBrain, loadSchedule, loadPosts]);

  const tokens = useMemo(() => tokensFrom(brain), [brain]);
  const slides = copy?.slides ?? [];
  const active = slides[slide] ?? slides[0];

  async function generate() {
    if (!brain) return;
    setBusy(true);
    setError(null);
    setQueued(false);
    try {
      const result = await make({ data: { brandId: brain.brandId, template, topic } });
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
      setSchedule(await loadSchedule());
      setPosts(await loadPosts());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't add that to the queue.");
    } finally {
      setBusy(false);
    }
  }

  if (!brain) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader eyebrow="The studio" title="Make your first brand first" />
        <Card>
          <p className="text-sm leading-relaxed text-ink-navy/60">
            The Studio designs in your brand's colours, fonts and voice — so it needs a Brand Brain
            before it can make anything.
          </p>
          <Link to="/app/brand" className={`${pillPrimaryClass} mt-5 inline-block`}>
            Create a Brand Brain
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="The studio"
        title="Make something on brand"
        subtitle={`Designed with ${brain.name}'s colours, type and voice.`}
        action={
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
                    className={`h-20 w-16 shrink-0 rounded-xl border px-2 py-2 text-left text-[0.58rem] leading-snug transition-all ${
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
              className="mt-3 w-full rounded-2xl border border-app-line bg-app-bg/60 px-4 py-3 text-sm text-ink-navy outline-none focus:border-cerulean"
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
                  className="mt-3 w-full rounded-2xl border border-app-line bg-app-bg/60 px-4 py-3 text-sm leading-relaxed text-ink-navy outline-none focus:border-cerulean"
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
                        setChannels((p) =>
                          p.includes(c) ? p.filter((x) => x !== c) : [...p, c],
                        )
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
            <CardLabel>Scheduled</CardLabel>
            {schedule.length === 0 ? (
              <p className="mt-4 text-sm text-ink-navy/50">Nothing scheduled yet.</p>
            ) : (
              <ul className="mt-4 divide-y divide-app-line">
                {schedule.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="text-sm text-ink-navy">{s.title}</p>
                      <p className="mt-0.5 text-xs text-ink-navy/50">
                        {s.channel} · {s.status}
                      </p>
                    </div>
                    <span className="text-xs tracking-[0.14em] text-ink-navy/45 uppercase">
                      {new Date(s.scheduled_for).toLocaleString("en-GB", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardLabel>Made so far</CardLabel>
            {posts.length === 0 ? (
              <p className="mt-4 text-sm text-ink-navy/50">No posts yet.</p>
            ) : (
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {posts.map((p) => (
                  <div key={p.id}>
                    <PostDesign
                      template={p.template ?? "carousel"}
                      tokens={tokens}
                      imageUrl={p.imageUrl}
                      content={{ headline: p.title }}
                    />
                    <p className="mt-2 text-xs text-ink-navy/50">
                      {p.channel} · {p.status}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
