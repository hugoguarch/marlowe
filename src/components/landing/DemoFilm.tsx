import { useRef, useState } from "react";
import demoThumb from "@/assets/marlowe-demo-thumb.jpg.asset.json";
import demoFilm from "@/assets/marlowe-demo-film.mp4.asset.json";
import { Reveal } from "@/components/landing/Reveal";

export function DemoFilm() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = () => {
    const video = videoRef.current;
    if (!video) return;
    video.play();
    setPlaying(true);
  };

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
          <div className="group relative isolate mt-10 aspect-video w-full overflow-hidden bg-ink">
            <video
              ref={videoRef}
              src={demoFilm.url}
              poster={stepsImage.url}
              preload="metadata"
              controls={playing}
              playsInline
              className="absolute inset-0 -z-10 h-full w-full object-cover"
              onEnded={() => setPlaying(false)}
            />
            {!playing && (
              <>
                <div className="absolute inset-0 -z-10 bg-ink/35 transition-colors duration-700 group-hover:bg-ink/50" />
                <button
                  type="button"
                  onClick={play}
                  aria-label="Play the Marlowe demo film"
                  className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-paper"
                >
                  <span className="flex h-20 w-20 items-center justify-center rounded-full border border-paper/50 transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-110 group-hover:border-paper group-hover:bg-paper/10">
                    <svg
                      viewBox="0 0 24 24"
                      className="ml-1 h-6 w-6 fill-current transition-transform duration-500 group-hover:scale-110"
                      aria-hidden="true"
                    >
                      <path d="M6 3.5v17l15-8.5-15-8.5Z" />
                    </svg>
                  </span>
                  <span className="eyebrow text-paper/70 transition-colors duration-500 group-hover:text-paper">
                    Watch the demo
                  </span>
                </button>
              </>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
