import stepsImage from "@/assets/steps.jpg.asset.json";
import { Reveal } from "@/components/landing/Reveal";

export function DemoFilm() {
  return (
    <section className="bg-paper">
      <div className="mx-auto max-w-[1400px] px-6 py-24 md:px-12 md:py-32">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <p className="eyebrow text-muted-foreground">The film</p>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Ninety seconds with Marlowe — the morning brief, start to finish.
            </p>
          </div>
        </Reveal>
        <Reveal delay={120}>
          <div className="relative isolate mt-10 aspect-video w-full overflow-hidden bg-ink">
            <img
              src={stepsImage.url}
              alt="Still frame from the Marlowe demo film"
              width={1920}
              height={1080}
              loading="lazy"
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-55"
            />
            <div className="absolute inset-0 -z-10 bg-ink/35" />
            <button
              type="button"
              aria-label="Play the Marlowe demo film"
              className="group absolute inset-0 flex flex-col items-center justify-center gap-6 text-paper"
            >
              <span className="flex h-20 w-20 items-center justify-center rounded-full border border-paper/50 transition-colors group-hover:border-paper">
                <svg
                  viewBox="0 0 24 24"
                  className="ml-1 h-6 w-6 fill-current"
                  aria-hidden="true"
                >
                  <path d="M6 3.5v17l15-8.5-15-8.5Z" />
                </svg>
              </span>
              <span className="eyebrow text-paper/70">Watch the demo</span>
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
