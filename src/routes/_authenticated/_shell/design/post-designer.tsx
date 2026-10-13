import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { IMAGES, noindex, SimpleScreen } from "@/components/shell/SimpleScreen";
import { Segmented, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/design/post-designer")({
  head: () => noindex("Post Designer", "Design social posts and carousels on the account's brand kit."),
  component: PostDesigner,
});

const SLIDES = ["Nine Elms, Reimagined", "420 New Homes on the River", "12 Minutes to Westminster", "Register Your Interest"];

function PostDesigner() {
  const [fmt, setFmt] = useState<"square" | "portrait" | "story">("portrait");
  const [i, setI] = useState(0);
  const ratio = { square: "aspect-square", portrait: "aspect-[4/5]", story: "aspect-[9/16]" }[fmt];
  return (
    <SimpleScreen
      title="Post Designer"
      sub="Carousels and stills built on each account's brand kit"
      cta="Send to scheduler"
      agent={{ title: "Designing a 4-slide launch carousel", steps: [["Pulled brand kit and photography", "done"], ["Laid out 4 slides", "done"], ["Writing captions", "run"], ["Accessibility check", "todo"]] }}
    >
      <WmCard className="p-5">
        <div className="mb-4 flex items-center gap-3">
          <Segmented value={fmt} onChange={setFmt} options={[{ id: "square", label: "1:1" }, { id: "portrait", label: "4:5" }, { id: "story", label: "9:16" }]} />
          <span className="ml-auto text-[12.5px] text-ink-navy/55">Slide {i + 1} of {SLIDES.length}</span>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          <div className={`relative ${ratio} max-h-[520px] overflow-hidden rounded-[6px] bg-ink-navy`}>
            <img src={IMAGES[i % IMAGES.length]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80" />
            <p className="absolute right-5 bottom-5 left-5 text-[26px] leading-tight font-light text-white">{SLIDES[i]}</p>
          </div>
          <div className="grid content-start grid-cols-4 gap-2">
            {SLIDES.map((s, n) => (
              <button key={s} onClick={() => setI(n)} className={`overflow-hidden rounded-[6px] border-2 ${n === i ? "border-cerulean" : "border-transparent"}`}>
                <img src={IMAGES[n % IMAGES.length]} alt={s} className="aspect-[4/5] w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </WmCard>
    </SimpleScreen>
  );
}
