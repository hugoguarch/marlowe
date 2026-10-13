import { createFileRoute } from "@tanstack/react-router";
import { Play } from "lucide-react";

import { IMAGES, noindex, SimpleScreen } from "@/components/shell/SimpleScreen";
import { WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/video/studio")({
  head: () => noindex("Auto-Edit Studio", "The agent cuts finished videos from raw footage."),
  component: VideoStudio,
});

const CLIPS = [18, 12, 22, 9, 15, 24];

function VideoStudio() {
  return (
    <SimpleScreen
      title="Auto-Edit Studio"
      sub="Raw footage in, finished cuts out"
      cta="Export"
      agent={{ title: "Cutting a 30s walkthrough from 42 RAW clips", steps: [["Selected 14 best takes", "done"], ["Rough cut to music", "done"], ["Colour grade", "run"], ["Captions and end card", "todo"]] }}
    >
      <WmCard className="p-5">
        <div className="relative aspect-video overflow-hidden rounded-[6px] bg-ink-navy">
          <img src={IMAGES[0]} alt="" className="h-full w-full object-cover opacity-85" />
          <span className="absolute inset-0 m-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-ink-navy"><Play size={22} /></span>
          <span className="absolute right-3 bottom-3 rounded-[4px] bg-ink-navy/80 px-2 py-0.5 text-[12px] text-white">0:12 / 0:30</span>
        </div>
        <div className="mt-4 space-y-2">
          <p className="kicker text-ink-navy/50">Timeline</p>
          <div className="flex gap-1 rounded-[6px] bg-app-bg p-1.5">
            {CLIPS.map((w, i) => (
              <div key={i} style={{ flex: w }} className="h-12 overflow-hidden rounded-[4px] border border-app-line">
                <img src={IMAGES[i % IMAGES.length]} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <div className="h-6 rounded-[4px] bg-cerulean/15" />
        </div>
      </WmCard>
    </SimpleScreen>
  );
}
