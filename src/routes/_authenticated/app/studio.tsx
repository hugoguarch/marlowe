import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { createPost } from "@/lib/marlowe.functions";
import { carouselSlides, channels, toneClass, weekCalendar } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Why Media AI" },
      { name: "description", content: "Preview, schedule and queue the content Marlowe built." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: StudioPage,
});

function StudioPage() {
  const [active, setActive] = useState(0);
  const slide = carouselSlides[active] ?? carouselSlides[0]!;
  const [picked, setPicked] = useState<string[]>(["Instagram"]);
  const [queued, setQueued] = useState(false);
  const [sending, setSending] = useState(false);
  const send = useServerFn(createPost);

  function toggle(channel: string) {
    setPicked((p) => (p.includes(channel) ? p.filter((c) => c !== channel) : [...p, channel]));
  }

  async function sendToQueue() {
    if (sending) return;
    setSending(true);
    try {
      await send({
        data: {
          title: "Carousel — the 6am edit",
          caption: slide.caption,
          format: "carousel",
          channels: picked,
          slides: carouselSlides.map((s) => ({ title: s.title, caption: s.caption })),
        },
      });
      setQueued(true);
    } catch {
      setQueued(false);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="The studio"
        title="This week, already made"
        subtitle="Marlowe built it overnight. Nudge a slide, choose the channels, send it to the queue."
      />

      <Card>
        <CardLabel>Carousel — the 6am edit</CardLabel>
        <div className="mt-5 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="aspect-[4/5] rounded-3xl border border-app-line bg-gradient-to-br from-ink-navy to-cerulean/80 p-7 text-white">
            <p className="text-[0.6rem] tracking-[0.24em] text-white/55 uppercase">
              Slide {active + 1} of {carouselSlides.length}
            </p>
            <p className="display mt-6 text-3xl font-light tracking-tight">
              {slide.title}
            </p>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              {slide.caption}
            </p>
          </div>

          <div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {carouselSlides.map((s, i) => (
                <button
                  key={s.title}
                  onClick={() => setActive(i)}
                  className={`h-24 w-20 shrink-0 rounded-xl border px-2 py-2 text-left text-[0.6rem] leading-snug transition-all duration-200 ${
                    i === active
                      ? "border-cerulean bg-cerulean/10 text-ink-navy"
                      : "border-app-line bg-app-bg/60 text-ink-navy/55 hover:-translate-y-0.5"
                  }`}
                >
                  {s.title}
                </button>
              ))}
            </div>

            <p className="mt-6 text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
              Schedule to
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {channels.map((c) => (
                <button
                  key={c.name}
                  onClick={() => toggle(c.name)}
                  className={`rounded-full border px-4 py-2 text-xs tracking-[0.12em] uppercase transition-all duration-200 ${
                    picked.includes(c.name)
                      ? "border-ink-navy bg-ink-navy text-white"
                      : "border-app-line bg-app-card text-ink-navy/65 hover:-translate-y-0.5"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setQueued(true)}
              className={`${pillPrimaryClass} mt-6`}
              disabled={picked.length === 0}
            >
              {queued ? "In the queue" : "Send to queue"}
            </button>
            <button className={`${pillClass} mt-6 ml-3`}>Ask for another version</button>
          </div>
        </div>
      </Card>

      <Card>
        <CardLabel>This week</CardLabel>
        <div className="mt-5 grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {weekCalendar.map((day) => (
            <div key={day.day} className="rounded-2xl border border-app-line bg-app-bg/50 p-3">
              <p className="text-[0.6rem] tracking-[0.2em] text-ink-navy/45 uppercase">
                {day.day}
              </p>
              <div className="mt-3 space-y-2">
                {day.items.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-app-card p-2.5 text-[0.68rem] leading-snug text-ink-navy/75"
                  >
                    <span
                      className={`mb-1.5 block h-1 w-6 rounded-full ${toneClass[item.tone]}`}
                    />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-4 text-[0.62rem] tracking-[0.16em] text-ink-navy/45 uppercase">
          {channels.map((c) => (
            <span key={c.name} className="flex items-center gap-2">
              <span className={`h-1.5 w-1.5 rounded-full ${toneClass[c.tone]}`} />
              {c.name}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}
