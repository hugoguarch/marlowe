import type { ReactNode } from "react";

import aerial from "@/assets/wm-london-aerial.jpg.asset.json";
import facade from "@/assets/wm-glass-facade.png.asset.json";
import bigben from "@/assets/wm-big-ben.jpg.asset.json";
import dusk from "@/assets/wm-london-city-dusk.jpg.asset.json";
import { AgentPanel, PreviewTag, Thumb } from "./Preview";
import { btnDark, Title } from "./ui";

export const IMAGES = [aerial.url, facade.url, bigben.url, dusk.url];

/** Shared layout for design-led screens whose data is not wired yet. TODO: wire to API. */
export function SimpleScreen({
  title,
  sub,
  cta,
  agent,
  items,
  children,
}: {
  title: string;
  sub: string;
  cta: string;
  agent: { title: string; steps: [string, "done" | "run" | "todo"][] };
  items?: { label: string; meta: string }[];
  children?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <Title title={title} sub={sub} action={<div className="flex items-center gap-2"><PreviewTag /><button className={btnDark}>{cta}</button></div>} />
      <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
        <AgentPanel title={agent.title} steps={agent.steps} />
        <div className="min-w-0 space-y-4">
          {children}
          {items ? (
            <div className="grid grid-cols-2 gap-4 2xl:grid-cols-4">
              {items.map((it, i) => <Thumb key={it.label} src={IMAGES[i % IMAGES.length]!} label={it.label} meta={it.meta} />)}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const noindex = (title: string, description: string) => ({
  meta: [{ title: `${title} — Why Media AI` }, { name: "description", content: description }, { name: "robots", content: "noindex" }],
});
