import { useServerFn } from "@tanstack/react-start";
import {
  BarChart3, Building2, Check, Clock, Download, FileText, Home, KeyRound, Leaf, Loader2, Lock, MapPin,
  PoundSterling, Send, ShieldCheck, Star, Trash2, TrendingUp, Type, Unlock, Upload, Users, Wand2,
  type LucideIcon,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { reviseBrandKit, type BrandBrain, type PaletteColour } from "@/lib/brand.functions";
import { themeFrom, useBrandFonts, useLogoTones } from "@/lib/brandTheme";

const ICONS: Record<string, LucideIcon> = {
  pound: PoundSterling, building: Building2, key: KeyRound, home: Home, shield: ShieldCheck, trend: TrendingUp,
  clock: Clock, users: Users, map: MapPin, chart: BarChart3, leaf: Leaf, star: Star,
};

type Patch = Partial<Pick<BrandBrain, "palette" | "typography" | "toneOfVoice" | "values" | "icons" | "socialLine" | "audience" | "version" | "locked" | "agentLog" | "personas">>;

function hexLum(h: string) {
  const n = parseInt(h.replace("#", ""), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
const contrast = (a: string, b: string) => { const [x, y] = [hexLum(a), hexLum(b)].sort((p, q) => q - p); return (x! + 0.05) / (y! + 0.05); };
const validHex = (h: string) => /^#[0-9a-f]{6}$/i.test(h);

export function BrandWorkspace({
  brain, brands, status, onSelect, persist, upload, analyse, onNewBrand, onMakeDefault, onDeleteBrand, onDeleteAsset, onPrimary, onTarget,
}: {
  brain: BrandBrain;
  brands: { id: string; name: string }[];
  status: string | null;
  onSelect: (id: string) => void;
  persist: (p: Patch) => Promise<void>;
  upload: (file: File, kind: string) => Promise<string>;
  analyse: (filePath: string) => Promise<void>;
  onNewBrand: () => void;
  onMakeDefault: () => void;
  onDeleteBrand: () => void;
  onDeleteAsset: (id: string) => void;
  onPrimary: (id: string, kind: string) => void;
  onTarget: (n: number) => void;
}) {
  useBrandFonts(brain);
  const tones = useLogoTones(brain);
  const t = themeFrom(brain, tones);
  const revise = useServerFn(reviseBrandKit);
  const [tab, setTab] = useState<"agent" | "sources" | "library">("agent");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "agent"; text: string }[]>([]);
  const input = useRef<HTMLTextAreaElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const ro = brain.locked;

  const logos = brain.assets.filter((a) => a.kind === "logo" && a.url);
  const docs = brain.assets.filter((a) => a.kind === "document");
  const fonts = brain.assets.filter((a) => a.kind === "font");
  const images = brain.assets.filter((a) => a.kind === "image" && a.url);
  const pal = brain.palette.filter((c) => validHex(c.hex));
  const pairs = pal.flatMap((a, i) => pal.slice(i + 1).map((b) => contrast(a.hex, b.hex)));
  const passing = pairs.filter((r) => r >= 4.5).length;

  const steps = [
    docs[0] ? `Read ${docs[0].file_name ?? "the brand guidelines"}` : "No guidelines document uploaded yet",
    `Found ${logos.length} logo file${logos.length === 1 ? "" : "s"}`,
    brain.typography.headline ? `Matched type to ${brain.typography.headline}${brain.typography.body && brain.typography.body !== brain.typography.headline ? ` + ${brain.typography.body}` : ""}` : "Typefaces still to set",
    "Built 10 guideline sections",
    pairs.length ? `Checked contrast: ${passing} of ${pairs.length} colour pairs pass for text` : "Add colours to check contrast",
    ...brain.agentLog.slice(-4),
  ];
  const summary = [
    ["Company", brain.name + (brain.website ? `, ${brain.website.replace(/^https?:\/\//, "")}` : "")],
    ["Audience", brain.audience ? brain.audience.split(/[.;]/)[0] : "Not set"],
    ["Palette", pal.length ? pal.slice(0, 4).map((c) => c.name).join(", ") : "Not set"],
    ["Voice", brain.toneOfVoice.slice(0, 2).join(" ") || "Not set"],
  ];
  const fontNote = [
    brain.typography.headline && !t.displayUploaded ? brain.typography.headline : null,
    brain.typography.body && !t.bodyUploaded && brain.typography.body !== brain.typography.headline ? brain.typography.body : null,
  ].filter(Boolean);

  async function ask(text: string) {
    if (!text.trim() || busy) return;
    if (ro) { toast.error("Unlock the brand kit to make changes."); return; }
    setChat((c) => [...c, { role: "user", text }]);
    setQ("");
    setBusy(true);
    try {
      const out = await revise({ data: { brandId: brain.brandId, request: text } });
      const p: Patch = {};
      if (out.palette) p.palette = out.palette.filter((c) => validHex(c.hex));
      if (out.typography) p.typography = out.typography;
      if (out.toneOfVoice) p.toneOfVoice = out.toneOfVoice;
      if (out.values) p.values = out.values;
      if (out.icons) p.icons = out.icons;
      if (out.socialLine) p.socialLine = out.socialLine;
      if (out.audience) p.audience = out.audience;
      p.agentLog = [...brain.agentLog, `Applied: ${text.slice(0, 70)}`];
      await persist(p);
      setChat((c) => [...c, { role: "agent", text: out.reply }]);
    } catch (e) {
      setChat((c) => [...c, { role: "agent", text: e instanceof Error ? e.message : "Couldn't apply that change." }]);
    } finally { setBusy(false); }
  }

  function exportPdf() {
    const w = window.open("", "_blank");
    if (!w || !board.current) return;
    const css = [...document.querySelectorAll('style, link[rel="stylesheet"]')].map((n) => n.outerHTML).join("");
    w.document.write(`<html><head><title>${brain.name} brand guidelines</title>${css}<style>@page{margin:12mm}body{background:#fff}</style></head><body>${board.current.outerHTML}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 800);
  }

  const pick = (accept: string, cb: (f: File) => Promise<void>) => () => {
    const i = document.createElement("input");
    i.type = "file"; i.accept = accept;
    i.onchange = async () => { const f = i.files?.[0]; if (f) { try { await cb(f); } catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed."); } } };
    i.click();
  };

  const variants: { label: string; bg: string; src: string; filter: string }[] = logos.length
    ? [
        { label: "PRIMARY LOCKUP", bg: "#ffffff", src: t.logoOnLight!.url, filter: t.logoOnLight!.filter },
        { label: `ON ${(pal.find((c) => c.hex === t.ink)?.name ?? "INK").toUpperCase()}`, bg: t.ink, src: t.logoOnDark!.url, filter: t.logoOnDark!.filter },
        ...logos.map((l, i) => ({ label: `FILE ${i + 1}`, bg: (tones[l.url!] ?? (/white|wht|reverse/i.test(l.file_name ?? "") ? "light" : "dark")) === "light" ? t.deep : t.paper, src: l.url!, filter: "" })),
      ]
    : [];

  const S = ({ n, title, children, className = "" }: { n: number; title: string; children: ReactNode; className?: string }) => (
    <section className={`rounded-[8px] border border-app-line bg-app-card p-5 ${className}`}>
      <p className="kicker mb-4 text-ink-navy/50">{String(n).padStart(2, "0")}. {title}</p>
      {children}
    </section>
  );
  const edit = "rounded-[4px] bg-transparent outline-none focus:bg-app-bg disabled:cursor-default";

  return (
    <div className="-mx-6 -mt-7 -mb-12 flex h-[calc(100vh-60px)] lg:-mx-8">
      {/* Design agent */}
      <aside className="flex w-[360px] shrink-0 flex-col border-r border-app-line bg-app-card">
        <div className="border-b border-app-line px-5 pt-4">
          <p className="kicker text-cerulean">Design agent</p>
          <div className="mt-1 flex items-center gap-2">
            <select value={brain.brandId} onChange={(e) => (e.target.value === "__new" ? onNewBrand() : onSelect(e.target.value))} className="min-w-0 flex-1 truncate bg-transparent text-[15px] font-medium outline-none">
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name} — Brand kit</option>)}
              <option value="__new">+ New brand kit</option>
            </select>
          </div>
          <div className="mt-3 flex gap-5 text-[13px]">
            {(["agent", "sources", "library"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`border-b-2 pb-2.5 capitalize ${tab === k ? "border-ink-navy font-medium" : "border-transparent text-ink-navy/50"}`}>{k}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5 text-[13px]">
          {tab === "agent" ? (
            <>
              <ul className="space-y-2">
                {steps.map((s) => <li key={s} className="flex gap-2.5 text-ink-navy/80"><Check size={14} className="mt-0.5 shrink-0 text-brand-green" />{s}</li>)}
              </ul>
              <p className="leading-relaxed">The {brain.name} brand kit is {ro ? `locked at v${brain.version}` : "ready for review"}.</p>
              <div className="rounded-[8px] bg-app-bg p-4">
                <p className="kicker mb-2.5 text-ink-navy/45">Review summary</p>
                {summary.map(([k, v]) => <p key={k} className="py-0.5 leading-relaxed"><span className="font-medium">{k}:</span> <span className="text-ink-navy/70">{v}</span></p>)}
              </div>
              {fontNote.length ? (
                <p className="rounded-[8px] border border-app-line p-3 leading-relaxed text-ink-navy/70">
                  No font files uploaded for {fontNote.join(" and ")}, so the web version of the same family is used where available. Upload the font files in Sources to use the licensed originals.
                </p>
              ) : null}
              {chat.map((m, i) => m.role === "user"
                ? <div key={i} className="ml-8 rounded-[8px] bg-ink-navy px-3.5 py-2.5 text-white">{m.text}</div>
                : <p key={i} className="flex gap-2 leading-relaxed"><Wand2 size={14} className="mt-0.5 shrink-0 text-cerulean" />{m.text}</p>)}
              {busy ? <p className="flex items-center gap-2 text-ink-navy/55"><Loader2 size={13} className="animate-spin" />Updating the brand kit…</p> : null}
            </>
          ) : tab === "sources" ? (
            <>
              <p className="text-ink-navy/60">Guidelines documents and font files the agent works from.</p>
              {[...docs, ...fonts].map((a) => (
                <div key={a.id} className="flex items-center gap-2.5 rounded-[6px] border border-app-line px-3 py-2">
                  {a.kind === "font" ? <Type size={14} /> : <FileText size={14} />}
                  <span className="min-w-0 flex-1 truncate">{a.file_name}</span>
                  <button aria-label="Remove" onClick={() => onDeleteAsset(a.id)} className="text-ink-navy/40 hover:text-destructive"><Trash2 size={13} /></button>
                </div>
              ))}
              <button onClick={pick(".pdf,.doc,.docx,.txt,.md", async (f) => { const p = await upload(f, "document"); await analyse(p); })} className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-app-line py-2.5"><Upload size={13} />Upload guidelines and read them</button>
              <button onClick={pick(".otf,.ttf,.woff,.woff2", async (f) => { await upload(f, "font"); })} className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-app-line py-2.5"><Upload size={13} />Upload font file</button>
              <p className="text-[12px] text-ink-navy/50">Name font files after the family (e.g. Raleway-Bold.otf) so they match the typography.</p>
            </>
          ) : (
            <>
              <p className="kicker text-ink-navy/45">Logos</p>
              <div className="grid grid-cols-3 gap-2">
                {logos.map((a) => (
                  <div key={a.id} className="group relative">
                    <button onClick={() => onPrimary(a.id, a.kind)} title="Set as primary" className={`flex aspect-square w-full items-center justify-center rounded-[6px] border bg-app-bg p-2 ${a.is_primary ? "border-cerulean" : "border-app-line"}`}><img src={a.url!} alt="" className="max-h-full max-w-full object-contain" /></button>
                    <button aria-label="Remove" onClick={() => onDeleteAsset(a.id)} className="absolute top-1 right-1 hidden rounded bg-white/90 p-0.5 group-hover:block"><Trash2 size={11} /></button>
                    {a.is_primary ? <span className="text-[10.5px] text-cerulean">Primary</span> : null}
                  </div>
                ))}
              </div>
              <button onClick={pick("image/*", async (f) => { await upload(f, "logo"); })} className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-app-line py-2"><Upload size={13} />Add logo</button>
              <p className="kicker pt-2 text-ink-navy/45">Photography</p>
              <div className="grid grid-cols-3 gap-2">
                {images.map((a) => (
                  <div key={a.id} className="group relative"><img src={a.url!} alt="" className="aspect-square w-full rounded-[6px] object-cover" />
                    <button aria-label="Remove" onClick={() => onDeleteAsset(a.id)} className="absolute top-1 right-1 hidden rounded bg-white/90 p-0.5 group-hover:block"><Trash2 size={11} /></button></div>
                ))}
              </div>
              <button onClick={pick("image/*", async (f) => { await upload(f, "image"); })} className="flex w-full items-center justify-center gap-2 rounded-[6px] border border-dashed border-app-line py-2"><Upload size={13} />Add photography</button>
              <div className="space-y-2 border-t border-app-line pt-4">
                <label className="flex items-center justify-between">Posts per day<input type="number" min={0} max={20} defaultValue={brain.dailyTarget} onBlur={(e) => onTarget(Number(e.target.value))} className="w-16 rounded-[6px] border border-app-line px-2 py-1" /></label>
                {!brain.isDefault ? <button onClick={onMakeDefault} className="text-cerulean">Make this the default brand</button> : <p className="text-ink-navy/50">Default brand</p>}
                <button onClick={onDeleteBrand} className="block text-destructive">Delete brand</button>
              </div>
            </>
          )}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); ask(q); }} className="flex items-end gap-2 border-t border-app-line p-3">
          <textarea ref={input} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(q); } }}
            rows={2} disabled={ro} placeholder={ro ? "Unlock the kit to ask for changes" : "Ask for a change, or add a section…"} className="flex-1 resize-none bg-transparent text-[13.5px] outline-none" />
          <button disabled={busy || !q.trim() || ro} aria-label="Send" className="rounded-[6px] bg-ink-navy p-2 text-white disabled:opacity-40"><Send size={14} /></button>
        </form>
      </aside>

      {/* Brand board */}
      <div className="flex min-w-0 flex-1 flex-col bg-app-bg">
        <div className="flex items-center gap-3 border-b border-app-line bg-app-card px-6 py-3">
          <div className="min-w-0">
            <p className="text-[12px] text-ink-navy/50">Brand Guidelines</p>
            <p className="flex items-center gap-2 text-[17px] font-medium">{brain.name} <span className="rounded-full bg-app-bg px-2 py-0.5 text-[11px] font-normal">v{brain.version}</span>{ro ? <span className="flex items-center gap-1 rounded-full bg-ink-navy px-2 py-0.5 text-[11px] font-normal text-white"><Lock size={10} />Locked</span> : null}</p>
          </div>
          <span className="ml-auto text-[12px] text-ink-navy/50">10 sections · {status ?? "auto-saved"}</span>
          <button onClick={exportPdf} className="flex items-center gap-1.5 rounded-[6px] border border-app-line bg-app-card px-3 py-1.5 text-[13px]"><Download size={13} />Export PDF</button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div ref={board} className="mx-auto grid max-w-[1100px] grid-cols-6 gap-4 text-ink-navy">
            <S n={1} title="Primary logo" className="col-span-4">
              <div className="flex aspect-[16/6] items-center justify-center rounded-[6px] bg-white">
                {t.logoOnLight ? <img src={t.logoOnLight.url} alt={brain.name} style={{ filter: t.logoOnLight.filter }} className="max-h-[70%] max-w-[70%] object-contain" /> : <span className="text-[13px] text-ink-navy/45">Upload a logo in Library</span>}
              </div>
            </S>
            <S n={2} title="The mark" className="col-span-2">
              <div className="flex aspect-square items-center justify-center rounded-[6px]" style={{ background: t.ink }}>
                {t.logoOnDark ? <img src={t.logoOnDark.url} alt="" style={{ filter: t.logoOnDark.filter }} className="max-h-[55%] max-w-[55%] object-contain" /> : null}
              </div>
            </S>
            <S n={3} title="Logo variants" className="col-span-6">
              {variants.length ? (
                <div className="grid grid-cols-5 gap-3">
                  {variants.map((v) => (
                    <div key={v.label}>
                      <div className="flex aspect-[4/3] items-center justify-center rounded-[6px] border border-app-line p-4" style={{ background: v.bg }}><img src={v.src} alt="" style={{ filter: v.filter }} className="max-h-full max-w-full object-contain" /></div>
                      <p className="mt-1.5 text-[10.5px] font-bold tracking-[0.16em] text-ink-navy/50">{v.label}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-[13px] text-ink-navy/45">Variants appear once a logo is uploaded.</p>}
            </S>
            <S n={4} title="Colour palette" className="col-span-6">
              <div className="grid grid-cols-6 gap-3">
                {brain.palette.map((c, i) => (
                  <div key={i} className="group">
                    <label className="relative block aspect-[4/5] cursor-pointer rounded-[6px] border border-app-line" style={{ background: validHex(c.hex) ? c.hex : "#fff" }}>
                      <input type="color" disabled={ro} value={validHex(c.hex) ? c.hex : "#ffffff"} onChange={(e) => persist({ palette: brain.palette.map((x, j) => (j === i ? { ...x, hex: e.target.value.toUpperCase() } : x)) })} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
                    </label>
                    <input disabled={ro} defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && persist({ palette: brain.palette.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} className={`mt-2 w-full text-[10.5px] font-bold tracking-[0.14em] uppercase ${edit}`} />
                    <div className="flex items-center">
                      <span className="flex-1 text-[12px] text-ink-navy/60">{c.hex.toUpperCase()}</span>
                      {!ro ? <button aria-label="Remove colour" onClick={() => persist({ palette: brain.palette.filter((_, j) => j !== i) })} className="hidden text-ink-navy/40 group-hover:block"><Trash2 size={11} /></button> : null}
                    </div>
                  </div>
                ))}
                {!ro && brain.palette.length < 12 ? (
                  <button onClick={() => persist({ palette: [...brain.palette, { name: "New colour", hex: "#888888" } as PaletteColour] })} className="flex aspect-[4/5] items-center justify-center rounded-[6px] border border-dashed border-app-line text-[12px] text-ink-navy/50">+ Add</button>
                ) : null}
              </div>
            </S>
            <S n={5} title="Typography" className="col-span-4">
              <div className="flex gap-6">
                <p className="text-[96px] leading-none" style={{ fontFamily: `"${t.display}"`, fontWeight: 800 }}>Aa</p>
                <div className="min-w-0 flex-1 space-y-3">
                  <div><p className="text-[11px] text-ink-navy/50">Display</p><input disabled={ro} defaultValue={brain.typography.headline} onBlur={(e) => e.target.value !== brain.typography.headline && persist({ typography: { ...brain.typography, headline: e.target.value } })} className={`w-full text-[15px] font-medium ${edit}`} placeholder="Headline typeface" /></div>
                  <p className="text-[22px] leading-tight" style={{ fontFamily: `"${t.display}"`, fontWeight: 700 }}>{brain.socialLine || `${brain.name}, made clear.`}</p>
                  <div><p className="text-[11px] text-ink-navy/50">Body</p><input disabled={ro} defaultValue={brain.typography.body} onBlur={(e) => e.target.value !== brain.typography.body && persist({ typography: { ...brain.typography, body: e.target.value } })} className={`w-full text-[15px] ${edit}`} placeholder="Body typeface" style={{ fontFamily: `"${t.body}"` }} /></div>
                  <textarea disabled={ro} defaultValue={brain.typography.notes} onBlur={(e) => e.target.value !== brain.typography.notes && persist({ typography: { ...brain.typography, notes: e.target.value } })} rows={2} placeholder="Usage notes" className={`w-full resize-none text-[13px] text-ink-navy/70 ${edit}`} style={{ fontFamily: `"${t.body}"` }} />
                </div>
              </div>
            </S>
            <S n={6} title="Icon system" className="col-span-2">
              <div className="grid grid-cols-4 gap-2">
                {(brain.icons.length ? brain.icons : []).map((ic, i) => {
                  const I = ICONS[ic.icon] ?? Star;
                  return (
                    <div key={i} className="group relative text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[6px] bg-app-bg"><I size={18} strokeWidth={1.75} style={{ color: i === 0 ? t.accent : t.ink }} /></div>
                      <input disabled={ro} defaultValue={ic.label} onBlur={(e) => persist({ icons: brain.icons.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} className={`mt-1 w-full text-center text-[10.5px] ${edit}`} />
                    </div>
                  );
                })}
              </div>
              {!brain.icons.length ? <button disabled={ro} onClick={() => ask("Choose 8 icons for the icon system that fit this brand's services.")} className="text-[13px] text-cerulean">Ask the agent to pick icons</button> : null}
            </S>
            <S n={7} title="Brand values" className="col-span-3">
              <div className="space-y-3">
                {brain.values.map((v, i) => (
                  <div key={i} className="group border-l-2 pl-3" style={{ borderColor: i === 0 ? t.accent : "rgba(0,28,38,0.12)" }}>
                    <div className="flex"><input disabled={ro} defaultValue={v.title} onBlur={(e) => persist({ values: brain.values.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)) })} className={`flex-1 text-[14px] font-medium ${edit}`} />
                      {!ro ? <button aria-label="Remove value" onClick={() => persist({ values: brain.values.filter((_, j) => j !== i) })} className="hidden text-ink-navy/40 group-hover:block"><Trash2 size={11} /></button> : null}</div>
                    <textarea disabled={ro} defaultValue={v.detail} onBlur={(e) => persist({ values: brain.values.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} rows={2} className={`w-full resize-none text-[12.5px] text-ink-navy/65 ${edit}`} />
                  </div>
                ))}
                {!ro && brain.values.length < 8 ? <button onClick={() => persist({ values: [...brain.values, { title: "New value", detail: "What it means in practice." }] })} className="text-[13px] text-cerulean">+ Add value</button> : null}
              </div>
            </S>
            <S n={8} title="Social template" className="col-span-3">
              <div className="relative mx-auto aspect-[4/5] max-w-[300px] overflow-hidden rounded-[6px]" style={{ background: t.ink }}>
                {images[0] ? <img src={images[0].url!} alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" /> : null}
                <div className="absolute inset-0 flex flex-col p-6 text-white">
                  {t.logoOnDark ? <img src={t.logoOnDark.url} alt="" style={{ filter: t.logoOnDark.filter }} className="h-6 w-auto self-start" /> : <p className="text-[11px] font-bold tracking-[0.2em]">{brain.name.toUpperCase()}</p>}
                  <textarea disabled={ro} defaultValue={brain.socialLine || "Your headline lands here."} onBlur={(e) => persist({ socialLine: e.target.value })} rows={3}
                    className="mt-auto resize-none bg-transparent text-[26px] leading-tight outline-none" style={{ fontFamily: `"${t.display}"`, fontWeight: 700 }} />
                  <p className="mt-3 border-t pt-2 text-[11px] opacity-80" style={{ borderColor: t.accent }}>{brain.website?.replace(/^https?:\/\//, "") ?? brain.name}</p>
                </div>
              </div>
            </S>
            <S n={9} title="Tone of voice" className="col-span-3">
              <textarea disabled={ro} defaultValue={brain.toneOfVoice.join("\n")} onBlur={(e) => persist({ toneOfVoice: e.target.value.split("\n").map((l) => l.trim()).filter(Boolean) })} rows={6} placeholder="One rule per line" className={`w-full resize-none text-[13.5px] leading-relaxed ${edit}`} />
            </S>
            <S n={10} title="Audience" className="col-span-3">
              <textarea disabled={ro} defaultValue={brain.audience} onBlur={(e) => e.target.value !== brain.audience && persist({ audience: e.target.value })} rows={6} placeholder="Who this brand speaks to" className={`w-full resize-none text-[13.5px] leading-relaxed ${edit}`} />
            </S>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-app-line bg-app-card px-6 py-3">
          <span className="text-[12.5px] text-ink-navy/55">{ro ? "Locked kits stay read-only everywhere until unlocked." : "Every edit saves automatically and applies to new designs."}</span>
          <button disabled={ro} onClick={() => { setTab("agent"); input.current?.focus(); }} className="ml-auto rounded-[6px] border border-app-line px-4 py-2 text-[13px] disabled:opacity-40">Request changes</button>
          {ro ? (
            <button onClick={() => persist({ locked: false })} className="flex items-center gap-1.5 rounded-[6px] border border-app-line px-4 py-2 text-[13px]"><Unlock size={13} />Unlock</button>
          ) : (
            <button onClick={() => { const [a, b] = brain.version.split(".").map(Number); persist({ locked: true, version: `${a || 1}.${(b || 0) + 1}`, agentLog: [...brain.agentLog, `Locked v${a || 1}.${(b || 0) + 1}`] }); toast.success("Brand kit locked"); }}
              className="flex items-center gap-1.5 rounded-[6px] bg-ink-navy px-4 py-2 text-[13px] text-white"><Lock size={13} />Lock brand kit</button>
          )}
        </div>
      </div>
    </div>
  );
}
