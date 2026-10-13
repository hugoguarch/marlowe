import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, CalendarClock, Check, Image as ImageIcon, Layers, Type, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { noindex } from "@/components/shell/SimpleScreen";
import { FadedMark } from "@/components/shell/ui";
import { getBrandBrain, type BrandBrain } from "@/lib/brand.functions";
import { useSelectedBrandId } from "@/lib/brandSelection";
import { generatePost, queuePost, type PostCopy } from "@/lib/studio.functions";

export const Route = createFileRoute("/_authenticated/_shell/design/post-designer")({
  head: () => noindex("Post Designer", "Design social posts and carousels on the account's brand kit, then schedule them."),
  component: PostDesigner,
});

const FORMATS = [
  { id: "portrait", label: "4:5 Feed", ratio: "4/5" },
  { id: "square", label: "1:1", ratio: "1/1" },
  { id: "story", label: "9:16 Story", ratio: "9/16" },
  { id: "landscape", label: "1.91:1 LinkedIn", ratio: "1.91/1" },
] as const;
type Fmt = (typeof FORMATS)[number]["id"];
const CHANNELS = ["Instagram", "Facebook", "LinkedIn", "TikTok", "Google Business"];
const ACCENTS = ["#ECC032", "#2E7D44", "#036C89", "#FFFFFF"];

function tomorrowAt(h: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(h, 0, 0, 0);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:00`;
}

function PostDesigner() {
  const { brandId, ready } = useSelectedBrandId();
  const loadBrain = useServerFn(getBrandBrain);
  const make = useServerFn(generatePost);
  const queue = useServerFn(queuePost);

  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [fmt, setFmt] = useState<Fmt>("portrait");
  const [panel, setPanel] = useState<"layers" | "assets">("layers");
  const [topic, setTopic] = useState("");
  const [copy, setCopy] = useState<PostCopy | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [bankPath, setBankPath] = useState<string | null>(null);
  const [slide, setSlide] = useState(0);
  const [accent, setAccent] = useState(ACCENTS[0]!);
  const [weight, setWeight] = useState<300 | 500>(300);
  const [size, setSize] = useState(40);
  const [channels, setChannels] = useState<string[]>(["Instagram"]);
  const [when, setWhen] = useState(tomorrowAt(9));
  const [busy, setBusy] = useState<"gen" | "sched" | null>(null);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadBrain({ data: brandId ? { brandId } : {} })
      .then((b) => setBrain(b))
      .catch(() => setBrain(null))
      .finally(() => setLoading(false));
  }, [ready, brandId, loadBrain]);

  const bank = (brain?.assets ?? []).filter((a) => a.kind === "image" && a.url);
  const slides = copy?.slides?.length ? copy.slides : [{ title: copy?.headline ?? "Your headline lands here", caption: copy?.subhead ?? "" }];
  const active = slides[slide] ?? slides[0]!;
  const palette = (brain?.palette ?? []).slice(0, 5);
  const ink = palette[0]?.hex ?? "#001C26";
  const ratio = FORMATS.find((f) => f.id === fmt)!.ratio;

  const words = active.title.trim().split(/\s+/).filter(Boolean);
  const checks = useMemo(() => [
    { ok: true, t: "One accent word per frame" },
    { ok: !!imageUrl, t: imageUrl ? "Photo behind a protection scrim" : "Add a photo or generate one" },
    { ok: true, t: "Contrast checked on dark scrim" },
    { ok: words.length <= 6, t: words.length <= 6 ? `Headline ${words.length} words` : `Headline ${words.length} words — aim for 3–6` },
  ], [imageUrl, words.length]);

  async function generate() {
    if (!brain) return;
    setBusy("gen");
    try {
      const r = await make({ data: { brandId: brain.brandId, template: "carousel", topic, imagePath: bankPath } });
      setCopy(r.copy);
      setImageUrl(r.imageUrl);
      setImagePath(r.imagePath);
      setSlide(0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't build that post.");
    } finally {
      setBusy(null);
    }
  }

  async function schedule() {
    if (!brain || !copy) return;
    if (!channels.length) return toast.error("Choose at least one channel.");
    setBusy("sched");
    try {
      const r = await queue({
        data: {
          brandId: brain.brandId,
          template: "carousel",
          title: copy.headline,
          caption: copy.caption,
          slides: copy.slides,
          channels,
          imagePath,
          scheduledFor: new Date(when).toISOString(),
        },
      });
      toast.success(`Scheduled for ${new Date(r.scheduledFor).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`, {
        action: { label: "Open scheduler", onClick: () => (window.location.href = "/marketing/scheduler") },
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't schedule that post.");
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <p className="text-[13.5px] text-ink-navy/55">Opening the designer…</p>;
  if (!brain) {
    return (
      <div className="max-w-xl rounded-[8px] border border-app-line bg-app-card p-6">
        <p className="text-[20px] font-light">Set up a brand kit first</p>
        <p className="mt-2 text-[13.5px] text-ink-navy/60">The designer uses the account's colours, fonts and voice.</p>
        <Link to="/design/brand" className="mt-4 inline-block rounded-[6px] bg-ink-navy px-4 py-2 text-[13px] text-white">Open Brand Guidelines</Link>
      </div>
    );
  }

  const headline = (() => {
    if (words.length < 2) return <>{active.title}</>;
    const last = words.length - 1;
    return <>{words.slice(0, last).join(" ")} <span style={{ color: accent, fontWeight: 500 }}>{words[last]}</span></>;
  })();

  return (
    <div className="-mx-6 -mt-7 -mb-12 flex min-h-[calc(100vh-60px)] lg:-mx-8">
      {/* Left: layers / assets / brand kit */}
      <aside className="hidden w-[220px] shrink-0 flex-col border-r border-app-line bg-app-card md:flex">
        <div className="flex gap-3.5 border-b border-app-line px-4 pt-3.5 text-[13px]">
          {(["layers", "assets"] as const).map((p) => (
            <button key={p} onClick={() => setPanel(p)} className={`pb-2.5 capitalize ${panel === p ? "border-b-2 border-cerulean font-medium" : "text-ink-navy/45"}`}>{p}</button>
          ))}
        </div>
        {panel === "layers" ? (
          [[Type, "Headline", true], [Type, "Kicker"], [Type, "Swipe cue"], [Layers, "Faded mark"], [Layers, "Protection scrim"], [ImageIcon, "Photo"]].map(([I, t, on]) => {
            const Icon = I as typeof Type;
            return (
              <div key={t as string} className={`flex items-center gap-2.5 px-4 py-[9px] text-[13px] ${on ? "bg-cerulean/[0.08]" : ""}`}>
                <Icon size={14} className="text-ink-navy/55" />{t as string}
              </div>
            );
          })
        ) : (
          <div className="grid grid-cols-3 gap-1.5 p-3">
            <button onClick={() => setBankPath(null)} className={`aspect-square rounded-[4px] border text-[10px] leading-tight ${bankPath === null ? "border-cerulean bg-cerulean/10" : "border-app-line"}`}>AI makes one</button>
            {bank.map((a) => (
              <button key={a.id} onClick={() => setBankPath(a.file_path)} className={`aspect-square overflow-hidden rounded-[4px] border-2 ${bankPath === a.file_path ? "border-cerulean" : "border-transparent"}`}>
                <img src={a.url!} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
            {!bank.length ? <p className="col-span-3 text-[12px] text-ink-navy/50">Upload photos on the Brand Guidelines page to use them here.</p> : null}
          </div>
        )}
        <div className="mt-auto space-y-2 border-t border-app-line px-4 py-3.5">
          <p className="kicker text-ink-navy/45">Brand kit</p>
          <div className="flex gap-1.5">
            {(palette.length ? palette : [{ hex: "#001C26" }, { hex: "#036C89" }, { hex: "#ECC032" }]).map((c, i) => (
              <span key={i} className="h-6 w-6 rounded-[4px] border border-app-line" style={{ background: c.hex }} />
            ))}
          </div>
          <p className="text-[12px] text-ink-navy/50">{brain.name} · {brain.typography?.headline?.split(",")[0]?.replace(/"/g, "") || "Helvetica Neue"}</p>
        </div>
      </aside>

      {/* Centre: canvas */}
      <section className="flex min-w-0 flex-1 flex-col items-center gap-3.5 px-6 pt-[22px] pb-4">
        <div className="flex items-center gap-2.5 self-stretch">
          <div className="flex gap-0.5 rounded-[7px] bg-app-line/60 p-[3px] text-[12.5px]">
            {FORMATS.map((f) => (
              <button key={f.id} onClick={() => setFmt(f.id)} className={`rounded-[5px] px-2.5 py-[5px] ${fmt === f.id ? "bg-app-card font-medium shadow-[0_1px_2px_rgba(0,28,38,0.08)]" : ""}`}>{f.label}</button>
            ))}
          </div>
          <span className="ml-auto text-[12.5px] text-ink-navy/50">Slide {slide + 1} of {slides.length}</span>
        </div>
        <div
          className="relative max-w-full overflow-hidden bg-cover bg-center shadow-[0_24px_60px_rgba(0,28,38,0.18)]"
          style={{ aspectRatio: ratio, height: fmt === "landscape" ? 300 : 470, backgroundColor: ink, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined }}
        >
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,28,38,0.15) 0%, rgba(0,28,38,0.75) 100%)" }} />
          <FadedMark size={460} className="!-right-[30%] !-bottom-[10%] !opacity-[0.08]" />
          <p className="absolute top-[30px] left-8 text-[10px] font-bold tracking-[0.24em] text-white">{brain.name.toUpperCase()}</p>
          <p className="absolute right-10 bottom-[72px] left-8 leading-[1.08] tracking-[-0.02em] text-white" style={{ fontSize: fmt === "landscape" ? size * 0.75 : size, fontWeight: weight, fontFamily: brain.typography?.headline || undefined }}>
            {headline}
          </p>
          <p className="absolute bottom-[34px] left-8 flex items-center gap-2.5 text-[11px] text-white/80">
            <span className="h-[1.5px] w-7 bg-cerulean" />{slides.length > 1 ? "Swipe to see more" : active.caption || "Find out more"}
          </p>
        </div>
        <div className="flex gap-2">
          {slides.map((s, i) => (
            <button key={i} onClick={() => setSlide(i)} title={s.title} className="h-[55px] w-11 bg-cover bg-center" style={{ backgroundColor: ink, backgroundImage: imageUrl ? `url(${imageUrl})` : undefined, outline: `2px solid ${i === slide ? "#036C89" : "transparent"}`, outlineOffset: 2, opacity: i === slide ? 1 : 0.7 }} />
          ))}
        </div>
        {copy ? (
          <textarea value={copy.caption} onChange={(e) => setCopy({ ...copy, caption: e.target.value })} rows={3} className="w-full max-w-[560px] rounded-[6px] border border-app-line bg-app-card px-3 py-2 text-[13px] leading-relaxed outline-none focus:border-cerulean" aria-label="Caption" />
        ) : null}
      </section>

      {/* Right: properties, check, AI, schedule */}
      <aside className="hidden w-[300px] shrink-0 flex-col overflow-y-auto border-l border-app-line bg-app-card lg:flex">
        <div className="space-y-3 border-b border-app-line px-[18px] py-4">
          <p className="kicker text-ink-navy/45">Headline</p>
          <div className="grid grid-cols-2 gap-2 text-[13px]">
            <select value={weight} onChange={(e) => setWeight(Number(e.target.value) as 300 | 500)} className="rounded-[6px] border border-app-line px-2.5 py-2"><option value={300}>Light 300</option><option value={500}>Medium 500</option></select>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="rounded-[6px] border border-app-line px-2.5 py-2">{[32, 36, 40, 48].map((n) => <option key={n} value={n}>{n} px</option>)}</select>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="flex-1">Accent word</span>
            {ACCENTS.map((c) => (
              <button key={c} onClick={() => setAccent(c)} aria-label={`Accent ${c}`} className="h-5 w-5 rounded-[4px] border border-app-line" style={{ background: c, outline: accent === c ? "2px solid #036C89" : "none", outlineOffset: 2 }} />
            ))}
          </div>
        </div>
        <div className="space-y-2.5 border-b border-app-line px-[18px] py-4">
          <p className="kicker text-ink-navy/45">Brand check</p>
          {checks.map((c) => (
            <p key={c.t} className="flex items-center gap-2 text-[13px]">
              {c.ok ? <Check size={15} className="text-brand-green" /> : <AlertTriangle size={15} className="text-gold" />}{c.t}
            </p>
          ))}
        </div>
        <div className="space-y-2.5 border-b border-app-line bg-app-bg px-[18px] py-4">
          <p className="flex items-center gap-2 text-[13px] font-medium"><Wand2 size={15} className="text-cerulean" />Edit with AI</p>
          <textarea value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="What's this post about? e.g. 420 new homes on the river" className="w-full rounded-[6px] border border-app-line bg-app-card px-3 py-2.5 text-[13px] leading-normal outline-none focus:border-cerulean" />
          <button onClick={generate} disabled={!!busy} className="w-full rounded-[6px] bg-cerulean py-[9px] text-[13px] font-medium text-white disabled:opacity-60">
            {busy === "gen" ? "Designing…" : copy ? "Generate again" : "Generate"}
          </button>
        </div>
        <div className="space-y-3 px-[18px] py-4">
          <p className="kicker flex items-center gap-1.5 text-ink-navy/45"><CalendarClock size={12} />Schedule</p>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((c) => (
              <button key={c} onClick={() => setChannels((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]))} className={`rounded-full border px-2.5 py-1 text-[12px] ${channels.includes(c) ? "border-ink-navy bg-ink-navy text-white" : "border-app-line"}`}>{c}</button>
            ))}
          </div>
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-9 w-full rounded-[6px] border border-app-line px-2.5 text-[13px]" aria-label="Date and time" />
          <button onClick={schedule} disabled={!copy || !!busy} className="w-full rounded-[6px] bg-ink-navy py-[9px] text-[13px] font-medium text-white disabled:opacity-40">
            {busy === "sched" ? "Scheduling…" : "Schedule post"}
          </button>
          {!copy ? <p className="text-[12px] text-ink-navy/50">Generate a design first, then schedule it.</p> : null}
          <Link to="/marketing/scheduler" className="block text-center text-[12.5px] text-cerulean">Open Post Scheduler</Link>
        </div>
      </aside>
    </div>
  );
}
