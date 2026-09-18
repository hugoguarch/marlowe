import { createFileRoute, Link } from "@tanstack/react-router";
import { useSession } from "@/lib/auth";
import logoAsset from "@/assets/wm-logo-white.png.asset.json";
import heroEarth from "@/assets/hero-earth.jpg.asset.json";
import spaceAstronaut from "@/assets/space-astronaut.jpg.asset.json";
import officeDesk from "@/assets/office-desk.jpg.asset.json";
import archCurves from "@/assets/arch-curves.jpg.asset.json";
import archSpiral from "@/assets/arch-spiral.jpg.asset.json";
import { Reveal } from "@/components/landing/Reveal";
import { Magnetic } from "@/components/landing/Magnetic";
import { DemoFilm } from "@/components/landing/DemoFilm";
import { WaitlistForm } from "@/components/landing/WaitlistForm";


const TITLE = "Marlowe — Why Media AI | Your whole marketing department, awake before you";
const DESCRIPTION =
  "Marlowe is an autonomous AI marketing colleague. It learns your brand once, then researches, creates, posts and reports while you sleep. Join the Why Media AI waitlist.";

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
    title: "It moves first.",
    body: "Every other tool sits in a chat box waiting to be told. Marlowe reads the market overnight, decides what matters, and hands you the work already finished.",
  },
  {
    title: "It becomes you.",
    body: "Your voice, your market, your customers. Marlowe learns them once and sharpens every week. Not generic output — your marketing, in your tone, at your standard.",
  },
  {
    title: "It arrives experienced.",
    body: "Fifteen years of Why Media's agency thinking is already inside it. You are not renting software. You are hiring the department on day one.",
  },
];

const STEPS = [
  {
    title: "Connect.",
    body: "Point Marlowe at your website and your channels. That is the whole setup.",
  },
  {
    title: "It meets your brand.",
    body: "Marlowe studies everything you have ever published, then tells you what it sees and what it would do first.",
  },
  {
    title: "Set the dial.",
    body: "Decide how far Marlowe can go alone. From there, the morning briefs simply begin.",
  },
];

function Landing() {
  return (
    <main className="bg-paper text-ink">
      {/* Hero — framed cinematic card */}
      <section className="bg-paper px-4 pt-4 pb-2 md:px-6 md:pt-6">
        <div className="relative isolate flex h-[88vh] min-h-[600px] w-full flex-col overflow-hidden bg-ink text-paper shadow-[0_40px_90px_-50px_rgba(0,0,0,0.55)]">
          <img
            src={heroEarth.url}
            alt="A satellite drifting above the lit curve of the Earth"
            width={1920}
            height={1088}
            loading="eager"
            className="ken-burns absolute inset-0 -z-10 h-full w-full object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink/55 via-ink/15 to-ink/75" />

          {/* Nav inside the frame */}
          <header className="flex items-center justify-between px-6 py-6 md:px-10 md:py-8">
            <img
              src={logoAsset.url}
              alt="Why Media"
              className="h-3.5 w-auto transition-opacity duration-500 hover:opacity-70 md:h-4"
              loading="eager"
            />
            <nav className="hidden items-center gap-10 text-xs tracking-[0.18em] text-paper/75 uppercase md:flex">
              <a href="#department" className="nav-link transition-colors hover:text-paper">
                Marlowe
              </a>
              <a href="#difference" className="nav-link transition-colors hover:text-paper">
                Why it is different
              </a>
              <a href="#steps" className="nav-link transition-colors hover:text-paper">
                How it works
              </a>
            </nav>
            <div className="flex items-center gap-5">
              {session ? (
                <Link
                  to="/app"
                  className="nav-link text-xs tracking-[0.16em] text-paper/75 uppercase transition-colors hover:text-paper"
                >
                  Open workspace
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="nav-link text-xs tracking-[0.16em] text-paper/75 uppercase transition-colors hover:text-paper"
                >
                  Log in
                </Link>
              )}
              <Magnetic>
              <a
                href="#waitlist"
                className="hover-lift sweep-dark group flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-xs tracking-[0.14em] text-ink uppercase"
              >
                Join the waitlist <span aria-hidden="true" className="arrow-nudge">↗</span>
              </a>
            </Magnetic>
          </header>


          {/* Headline upper-left */}
          <div className="px-6 pt-10 md:px-10 md:pt-14">
            <Reveal>
              <p className="eyebrow text-paper/60">Why Media AI</p>
              <h1 className="display mt-6 max-w-4xl text-[2.6rem] sm:text-6xl md:text-7xl lg:text-[5rem]">
                Your whole marketing
                <br />
                department. Awake before you.
              </h1>
            </Reveal>
          </div>

          {/* Bottom rail */}
          <div className="mt-auto flex flex-col gap-8 px-6 pb-8 md:flex-row md:items-end md:justify-between md:px-10 md:pb-10">
            <Reveal delay={120}>
              <div className="max-w-md">
                <p className="text-sm leading-relaxed text-paper/80">
                  Meet Marlowe — not a tool you operate, a colleague you trust. It
                  learns your brand once, then researches, creates, posts and reports
                  on its own while the city sleeps.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-5">
                  <Magnetic>
                    <a
                      href="#waitlist"
                      className="hover-lift sweep group flex items-center gap-2 rounded-full border border-paper/60 px-7 py-3 text-xs tracking-[0.14em] text-paper uppercase"
                    >
                      Join the waitlist <span aria-hidden="true" className="arrow-nudge">↗</span>
                    </a>
                  </Magnetic>
                  <span className="text-xs text-paper/60">
                    Founding members onboard first.
                  </span>
                </div>
              </div>
            </Reveal>
            <span className="scroll-hint hidden text-xs tracking-[0.16em] text-paper/60 md:block">
              Scroll to discover
            </span>

          </div>
        </div>
      </section>

      <DemoFilm />



      {/* A normal Monday */}
      <section className="bg-paper">
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-muted-foreground">A normal Monday</p>
            <h2 className="display mt-10 max-w-4xl text-4xl md:text-6xl lg:text-7xl">
              You do not brief Marlowe. Marlowe briefs you.
            </h2>
          </Reveal>

          <div className="mt-20 grid items-stretch gap-0 lg:grid-cols-[0.85fr_1.15fr]">
            <Reveal className="h-full">
              <div className="img-zoom h-full">
                <img
                  src={officeDesk.url}
                  alt="An empty executive desk in early morning light"
                  width={1280}
                  height={1920}
                  loading="lazy"
                  className="h-full min-h-[420px] w-full object-cover"
                />
              </div>
            </Reveal>

            <Reveal delay={120} className="h-full">
              <figure className="flex h-full flex-col justify-center bg-ink p-10 text-paper md:p-16">
                <figcaption className="eyebrow text-paper/45">
                  Marlowe — 06:41
                </figcaption>
                <blockquote className="mt-8 text-xl leading-relaxed md:text-[1.6rem] md:leading-[1.55]">
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

          <Reveal delay={80}>
            <p className="mt-16 max-w-3xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              That message was already waiting when you opened your phone. While you
              slept, Marlowe watched the trends, read the numbers, made the content,
              handled the comments and answered the reviews. All it needs from you is
              a yes.
            </p>
          </Reveal>
        </div>
      </section>

      {/* The whole department */}
      <section
        id="department"
        className="relative isolate scroll-mt-8 overflow-hidden bg-ink text-paper"
      >
        <img
          src={archSpiral.url}
          alt=""
          aria-hidden="true"
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-15"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/70" />
        <div className="mx-auto max-w-[1400px] px-6 py-28 md:px-12 md:py-40">
          <Reveal>
            <p className="eyebrow text-paper/45">The whole department</p>
            <h2 className="display mt-10 max-w-3xl text-4xl md:text-6xl">
              Eleven specialists. One calm voice.
            </h2>
            <p className="mt-10 max-w-xl text-lg leading-relaxed text-paper/70">
              You are not buying eleven subscriptions and stitching them together.
              Marlowe is one mind that does all of it, and remembers everything it did
              yesterday.
            </p>
          </Reveal>
          <div className="mt-20 grid border-t border-rule-light sm:grid-cols-2 lg:grid-cols-3">
            {DISCIPLINES.map((item, index) => (
              <Reveal key={item} delay={index * 40}>
                <div className="row-hover flex h-full items-baseline gap-6 border-b border-rule-light py-8 pr-8 hover:bg-paper/5">
                  <span className="row-index text-xs text-paper/40 tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="row-text text-lg leading-snug">{item}</span>
                </div>
              </Reveal>

            ))}
          </div>
        </div>
      </section>

      {/* Not another AI tool */}
      <section id="difference" className="scroll-mt-8 bg-bone">
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
                <div className="card-hover h-full">
                  <span className="card-rule mb-6" aria-hidden="true" />
                  <h3 className="text-xl leading-snug">{item.title}</h3>
                  <p className="mt-5 text-base leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </Reveal>

            ))}
          </div>
          <Reveal delay={160}>
            <div className="mt-20 grid items-center gap-0 border-t border-rule pt-16 md:grid-cols-2">
              <p className="max-w-xl pb-10 text-xl leading-relaxed md:pr-16 md:pb-0 md:text-2xl">
                And you never lose the wheel. Marlowe asks before anything that touches
                money, goes public, or matters.
              </p>
              <div className="img-zoom">
                <img
                  src={archCurves.url}
                  alt="Sweeping metal architectural curves against a clear sky"
                  width={1920}
                  height={1391}
                  loading="lazy"
                  className="aspect-[4/3] w-full object-cover"
                />
              </div>

            </div>
          </Reveal>
        </div>
      </section>

      {/* Three steps */}
      <section id="steps" className="scroll-mt-8 bg-ink text-paper">
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
                <div className="card-hover h-full">
                  <span className="eyebrow text-paper/40">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-6 text-2xl">{step.title}</h3>
                  <span className="card-rule mt-4" aria-hidden="true" />
                  <p className="mt-4 text-base leading-relaxed text-paper/70">
                    {step.body}
                  </p>
                </div>
              </Reveal>

            ))}
          </div>
        </div>
      </section>

      {/* Out of this world band */}
      <section className="relative isolate overflow-hidden bg-ink text-paper">
        <img
          src={spaceAstronaut.url}
          alt="A lone astronaut drifting above the curve of the Earth"
          width={1920}
          height={1920}
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 -z-10 bg-ink/55" />
        <div className="mx-auto max-w-[1400px] px-6 py-32 text-center md:px-12 md:py-48">
          <Reveal>
            <p className="eyebrow text-paper/55">The quiet advantage</p>
            <h2 className="display mx-auto mt-10 max-w-4xl text-3xl md:text-5xl lg:text-6xl">
              Your competitors are still writing prompts. You will be asleep.
            </h2>
          </Reveal>
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
              className="nav-link pb-0.5 text-paper/80 transition-colors hover:text-paper"
            >
              Follow along and watch it market itself.
            </a>
          </p>
          <div className="mt-14 flex flex-col gap-6 border-t border-rule-light pt-8 sm:flex-row sm:items-center sm:justify-between">
            <img src={logoAsset.url} alt="Why Media" className="h-5 w-auto transition-opacity duration-500 hover:opacity-70" />
            <p className="text-xs tracking-[0.16em] text-paper/40 uppercase">
              Why Media AI — Marlowe
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
