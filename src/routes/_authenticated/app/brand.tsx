import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Sphere } from "@/components/app/Sphere";
import { Card, CardLabel, PageHeader, pillClass } from "@/components/app/ui";
import { learned, palette, personas, toneOfVoice } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/brand")({
  head: () => ({
    meta: [
      { title: "Brand Brain — Why Media AI" },
      { name: "description", content: "Everything Marlowe knows about your brand." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandPage,
});

function EditableList({ initial }: { initial: string[] }) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState(false);

  return (
    <div>
      <ul className="mt-4 space-y-3">
        {items.map((line, i) => (
          <li key={i}>
            {editing ? (
              <input
                value={line}
                onChange={(e) =>
                  setItems((prev) => prev.map((p, j) => (j === i ? e.target.value : p)))
                }
                className="w-full rounded-xl border border-app-line bg-app-bg/60 px-3 py-2 text-sm text-ink-navy outline-none focus:border-cerulean"
              />
            ) : (
              <p className="text-sm leading-relaxed text-ink-navy/75">{line}</p>
            )}
          </li>
        ))}
      </ul>
      <button onClick={() => setEditing((v) => !v)} className={`${pillClass} mt-5`}>
        {editing ? "Done" : "Edit"}
      </button>
    </div>
  );
}

function BrandPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="The brand brain"
        title="Everything Marlowe knows about you"
        subtitle="Marlowe learned this from your site and channels. Correct anything and it adapts from the next brief."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardLabel>Logo</CardLabel>
          <div className="mt-5 flex items-center gap-5 rounded-2xl border border-app-line bg-app-bg/60 p-6">
            <Sphere size={56} />
            <div>
              <p className="text-sm text-ink-navy">Why Media AI — primary mark</p>
              <p className="mt-1 text-xs text-ink-navy/45">PNG · transparent · 1024px</p>
            </div>
          </div>
          <button className={`${pillClass} mt-5`}>Replace logo</button>
        </Card>

        <Card>
          <CardLabel>Colour palette</CardLabel>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {palette.map((c) => (
              <div key={c.name}>
                <div
                  className="h-20 rounded-2xl border border-app-line"
                  style={{ backgroundColor: c.hex }}
                />
                <p className="mt-2 text-sm text-ink-navy">{c.name}</p>
                <p className="text-xs text-ink-navy/45">{c.hex}</p>
              </div>
            ))}
          </div>
          <button className={`${pillClass} mt-5`}>Edit palette</button>
        </Card>

        <Card>
          <CardLabel>Typography</CardLabel>
          <p className="display mt-4 text-3xl font-light tracking-tight">Helvetica Neue</p>
          <p className="mt-2 text-sm text-ink-navy/55">
            Thin for headlines, regular for body. Tight tracking, generous line height.
          </p>
          <div className="mt-5 space-y-2 border-t border-app-line pt-4 text-ink-navy/70">
            <p className="text-2xl font-light">Headline — 300</p>
            <p className="text-sm">Body copy — 400, 1.7 line height</p>
            <p className="text-[0.62rem] tracking-[0.24em] uppercase">Label — 0.24em</p>
          </div>
          <button className={`${pillClass} mt-5`}>Edit typography</button>
        </Card>

        <Card>
          <CardLabel>Tone of voice</CardLabel>
          <EditableList initial={toneOfVoice} />
        </Card>

        <Card className="lg:col-span-2">
          <CardLabel>Audience and personas</CardLabel>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {personas.map((p) => (
              <div key={p.name} className="rounded-2xl border border-app-line bg-app-bg/60 p-5">
                <p className="text-sm text-ink-navy">{p.name}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-navy/55">{p.detail}</p>
              </div>
            ))}
          </div>
          <button className={`${pillClass} mt-5`}>Edit personas</button>
        </Card>

        <Card dark className="lg:col-span-2">
          <CardLabel>What's working for this brand</CardLabel>
          <p className="mt-3 text-sm text-white/55">
            Learned by Marlowe over the last eight weeks. It sharpens every week.
          </p>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {learned.map((l) => (
              <li key={l} className="flex gap-3 text-sm leading-relaxed text-white/85">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                {l}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
