import { createFileRoute } from "@tanstack/react-router";
import logoAsset from "@/assets/wm-logo-white.png.asset.json";
import { Reveal } from "@/components/landing/Reveal";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

const TITLE = "Marlowe — Why Media AI | A whole marketing department, in one hire";
const DESCRIPTION =
  "Marlowe is your AI marketing partner. It learns your brand once, then researches, creates, posts and reports on its own. Join the Why Media AI waitlist.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const DISCIPLINES = [
  "Strategy and brand",
  "Content and copy",
  "Social media, posted for you",
  "Comments and DMs, answered in your voice",
  "Google Business and reviews",
  "SEO and AI search",
  "Design and creative",
  "Short-form video",
  "Competitor and trend research",
  "Reporting that actually explains itself",
  "Ads and email, as you grow",
];

const DIFFERENCES = [
  {
    title: "Proactive, not prompted.",
    body: "Other tools sit in a chat waiting for instructions. Marlowe works on its own and comes to you with it done.",
  },
  {
    title: "It becomes your brand.",
    body: "Marlowe learns your voice, your market and what works for you, and gets sharper every week. It is your marketing, not generic output.",
  },
  {
    title: "Agency expertise, built in.",
    body: "Marlowe carries Why Media's fifteen years of marketing knowledge. You are not renting software, you are hiring a team.",
  },
];

const STEPS = [
  {
    title: "Connect.",
    body: "Point Marlowe at your website and channels.",
  },
  {
    title: "Meet your brand.",
    body: "Marlowe studies everything and comes back with what it sees and what it would do first.",
  },
  {
    title: "Set the dial.",
    body: "Choose how much Marlowe can do on its own. Then the morning briefs begin.",
  },
];

function Landing() {
  return (
    <main className="bg-paper text-ink">
      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-8 md:px-12">
          <img
            src={logoAsset.url}
            alt="Why Media"
            className="h-5 w-auto md:h-6"
            loading="eager"
          />
          <a
            href="#waitlist"
            className="eyebrow border-b border-paper/40 pb-1 text-paper transition-colors hover:border-paper"
          >
            Join the waitlist
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-6 pt-40 pb-24 md:px-12 md:pt-52 md:pb-32">
          <Reveal>
            <p className="eyebrow text-paper/55">Why Media AI</p>
            <h1 className="display mt-10 max-w-5xl text-[2.75rem] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
              Meet Marlowe. A whole marketing department, in one hire.
            </h1>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-14 grid gap-12 border-t border-rule-light pt-12 md:grid-cols-[1.1fr_0.9fr]">
              <p className="max-w-xl text-lg leading-relaxed text-paper/70">
                Marlowe is your AI marketing partner. It learns your brand once, then
                researches, creates, posts and reports on its own. You wake up to the
                work already done.
              </p>
              <div className="flex flex-col items-start gap-5 md:items-end">
                <a
                  href="#waitlist"
                  className="bg-paper px-10 py-4 text-sm tracking-[0.14em] text-ink uppercase transition-opacity hover:opacity-85"
                >
                  Join the waitlist
                </a>
                <span className="text-sm text-paper/55">
                  Founding members onboard first.
                </span>
              </div>
            </div>
          </Reveal>
          <Reveal delay={200}>
            <div className="mt-20 border border-rule-light">
              <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-6 bg-paper/[0.03]">
                <span
                  aria-hidden="true"
                  className="flex h-16 w-16 items-center justify-center rounded-full border border-paper/40"
                >
                  <span className="ml-1 block h-0 w-0 border-y-[8px] border-l-[13px] border-y-transparent border-l-paper" />
                </span>
                <span className="eyebrow text-paper/45">The demo film</span>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* A normal Monday */}
      <section className="bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-muted-foreground">A normal Monday</p>
            <h2 className="display mt-10 max-w-4xl text-4xl md:text-6xl lg:text-7xl">
              You do not brief Marlowe. Marlowe briefs you.
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-16 md:grid-cols-2">
            <Reveal delay={80}>
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
                Every morning, Marlowe has already been working. It watched the
                trends, read the numbers, made the content, handled the comments, and
                answered the reviews. Then it tells you what it did, what it decided,
                and the few things it needs from you.
              </p>
            </Reveal>
            <Reveal delay={160}>
              <figure className="bg-ink p-10 text-paper md:p-14">
                <figcaption className="eyebrow text-paper/45">
                  Marlowe, 06:41
                </figcaption>
                <blockquote className="mt-8 text-xl leading-relaxed md:text-2xl md:leading-relaxed">
                  “Morning. Two trends broke in your market overnight, so I built the
                  posts. Your best content this week was Tuesday's reel, so I made
                  three more like it. A competitor tried to undercut you, I have the
                  response ready. And from your inbox it looks like you are planning
                  something for Christmas. Shall I start? Approve and I will ship it
                  all now.”
                </blockquote>
              </figure>
            </Reveal>
          </div>
        </div>
      </section>

      {/* The whole department */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-paper/45">The whole department</p>
            <h2 className="display mt-10 max-w-3xl text-4xl md:text-6xl">
              One partner. Every discipline.
            </h2>
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-paper/70">
              Marlowe is not one tool. It is a full marketing team, working together,
              behind one calm voice.
            </p>
          </Reveal>
          <div className="mt-20 grid border-t border-rule-light sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map((item, index) => (
              <Reveal key={item} delay={index * 40}>
                <div className="flex h-full items-baseline gap-6 border-b border-rule-light py-8 pr-8">
                  <span className="text-xs text-paper/40 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="text-lg leading-snug">{item}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Not another AI tool */}
      <section className="bg-bone">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-muted-foreground">Not another AI tool</p>
            <h2 className="display mt-10 max-w-4xl text-4xl md:text-6xl">
              Most AI waits to be told. Marlowe decides.
            </h2>
          </Reveal>
          <div className="mt-20 grid gap-14 border-t border-rule pt-14 md:grid-cols-3">
            {DIFFERENCES.map((item, index) => (
              <Reveal key={item.title} delay={index * 90}>
                <h3 className="text-xl leading-snug">{item.title}</h3>
                <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                  {item.body}
                </p>
              </Reveal>
            ))}
          </div>
          <Reveal delay={200}>
            <p className="mt-20 max-w-3xl border-t border-rule pt-10 text-lg leading-relaxed">
              And you are always in control. Marlowe asks before anything that touches
              money, goes public, or matters.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Three steps */}
      <section className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-paper/45">Up and running in minutes</p>
            <h2 className="display mt-10 max-w-3xl text-4xl md:text-6xl">
              Three steps. Then it runs.
            </h2>
          </Reveal>
          <div className="mt-20 grid gap-12 border-t border-rule-light pt-14 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <Reveal key={step.title} delay={index * 90}>
                <span className="eyebrow text-paper/40">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-6 text-2xl">{step.title}</h3>
                <p className="mt-4 text-base leading-relaxed text-paper/70">
                  {step.body}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Founding members + waitlist */}
      <section id="waitlist" className="scroll-mt-8 bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <h2 className="display max-w-4xl text-4xl md:text-6xl">
              The founding cohort onboards first.
            </h2>
            <p className="mt-10 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              We are opening Why Media AI to a small founding group. Early access,
              founding pricing, and a direct line into what we build next. Join the
              waitlist and tell us what you would want Marlowe to do for you.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <div className="mt-20 border-t border-rule pt-16">
              <WaitlistForm />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Quiet proof + footer */}
      <footer className="bg-ink text-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-16 md:px-12 md:py-20">
          <p className="max-w-2xl text-sm leading-relaxed text-paper/55">
            This account is run by Marlowe.{" "}
            <a
              href="#waitlist"
              className="border-b border-paper/30 pb-0.5 text-paper/80 transition-colors hover:border-paper"
            >
              Follow along and watch it market itself.
            </a>
          </p>
          <div className="mt-14 flex flex-col gap-6 border-t border-rule-light pt-8 sm:flex-row sm:items-center sm:justify-between">
            <img src={logoAsset.url} alt="Why Media" className="h-5 w-auto" />
            <p className="text-xs tracking-[0.16em] text-paper/40 uppercase">
              Why Media AI — Marlowe
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
