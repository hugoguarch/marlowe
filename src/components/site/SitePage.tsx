import type { CSSProperties, ReactNode } from "react";

import towers from "@/assets/wm-london-city-dusk.jpg.asset.json";
import type { BrandTheme } from "@/lib/brandTheme";

export const SECTION_TYPES = ["nav", "hero", "overlay", "stats", "tabs", "form", "calc", "footer"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
export type SiteItem = { title: string; body: string };
export type SiteSection = {
  id: string;
  type: SectionType;
  hidden?: boolean;
  kicker: string;
  heading: string;
  body: string;
  cta: string;
  image: string;
  items: SiteItem[];
  style?: { pt?: number | undefined; pb?: number | undefined; size?: number | undefined; weight?: number | undefined; bg?: "paper" | "ink" | "accent" | "white" | undefined };
};

export const SECTION_LABELS: Record<SectionType, string> = {
  nav: "Navigation", hero: "Hero · split", overlay: "Hero · image", stats: "Proof stats",
  tabs: "Services tabs", form: "Contact form", calc: "Loan calculator", footer: "Footer",
};

const uid = () => Math.random().toString(36).slice(2, 10);

export function newSection(type: SectionType, brand = "Your brand"): SiteSection {
  const base = { id: uid(), type, kicker: "", heading: "", body: "", cta: "", image: "", items: [] as SiteItem[] };
  switch (type) {
    case "nav": return { ...base, heading: brand, cta: "Get in touch", items: ["Services", "About", "Case Studies", "Contact"].map((t) => ({ title: t, body: "" })) };
    case "hero": return { ...base, kicker: "What we do", heading: "A clear promise in one line.", body: "One or two sentences on who you help and how.", cta: "Get in touch", image: towers.url };
    case "overlay": return { ...base, kicker: "Welcome", heading: "A headline over your best photograph.", body: "A short supporting line.", cta: "Find out more", image: towers.url };
    case "stats": return { ...base, heading: "Our numbers", items: [{ title: "—", body: "Add a figure" }, { title: "—", body: "Add a figure" }, { title: "—", body: "Add a figure" }, { title: "—", body: "Add a figure" }] };
    case "tabs": return { ...base, kicker: "Services", heading: "What we offer.", items: [{ title: "Service one", body: "Describe it." }, { title: "Service two", body: "Describe it." }, { title: "Service three", body: "Describe it." }] };
    case "form": return { ...base, kicker: "Contact", heading: "Speak to the team.", body: "Leave your details and we'll be in touch.", cta: "Send" };
    case "calc": return { ...base, kicker: "Calculator", heading: "Estimate your loan.", body: "Move the sliders to see an illustrative monthly cost.", cta: "Get a quote" };
    case "footer": return { ...base, heading: brand, body: `© ${new Date().getFullYear()} ${brand}. All rights reserved.`, items: ["Privacy", "Terms", "Contact"].map((t) => ({ title: t, body: "" })) };
  }
}

export function starterPage(brand: string): SiteSection[] {
  return (["nav", "overlay", "stats", "tabs", "form", "footer"] as SectionType[]).map((t) => newSection(t, brand));
}

type EditKey = "kicker" | "heading" | "body" | "cta";

export function SitePage({
  sections, theme, selected, onSelect, onEdit, editable = false, mobile = false,
}: {
  sections: SiteSection[];
  theme: BrandTheme;
  selected?: string | null | undefined;
  onSelect?: ((id: string) => void) | undefined;
  onEdit?: (id: string, patch: Partial<SiteSection>) => void;
  editable?: boolean;
  mobile?: boolean;
}) {
  const T = (s: SiteSection, k: EditKey, cls: string, style?: CSSProperties) =>
    s[k] ? (
      <EditText editable={editable} value={s[k]} onChange={(v) => onEdit?.(s.id, { [k]: v })} className={cls} style={style} />
    ) : null;
  const bgOf = (s: SiteSection, d: "paper" | "ink" | "white") => {
    const b = s.style?.bg ?? d;
    return { paper: theme.paper, ink: theme.ink, accent: theme.accent, white: "#ffffff" }[b];
  };
  const dark = (s: SiteSection, d: "paper" | "ink" | "white") => ["ink", "accent"].includes(s.style?.bg ?? d);
  const pad = (s: SiteSection, d = 64): CSSProperties => ({ paddingTop: s.style?.pt ?? d, paddingBottom: s.style?.pb ?? d });
  const h = (s: SiteSection, d: number): CSSProperties => ({ fontFamily: `"${theme.display}", sans-serif`, fontWeight: s.style?.weight ?? 700, fontSize: Math.round((s.style?.size ?? d) * (mobile ? 0.6 : 1)), lineHeight: 1.05, letterSpacing: "-0.02em" });
  const cols = mobile ? "grid-cols-1" : "";

  return (
    <div style={{ fontFamily: `"${theme.body}", sans-serif`, color: theme.ink, background: theme.paper }} className="overflow-hidden">
      {sections.filter((s) => !s.hidden).map((s) => {
        const sel = selected === s.id;
        const wrap = (children: ReactNode, style: CSSProperties) => (
          <section key={s.id} onClick={() => onSelect?.(s.id)} style={style}
            className={`relative ${onSelect ? "cursor-pointer" : ""} ${sel ? "outline outline-2 -outline-offset-2 outline-[#036C89]" : onSelect ? "hover:outline hover:outline-1 hover:-outline-offset-1 hover:outline-[#036C89]/50" : ""}`}>
            {sel ? <span className="absolute top-0 left-0 z-10 bg-[#036C89] px-2 py-0.5 text-[10px] font-medium text-white">{SECTION_LABELS[s.type]}</span> : null}
            {children}
          </section>
        );
        const btn = (light: boolean) => s.cta ? (
          <span style={{ background: light ? theme.accent : theme.ink, color: "#fff" }} className="inline-block px-5 py-3 text-[13px] font-medium">
            <EditText editable={editable} value={s.cta} onChange={(v) => onEdit?.(s.id, { cta: v })} />
          </span>
        ) : null;
        switch (s.type) {
          case "nav":
            return wrap(
              <div className="flex items-center gap-6 px-[6%] py-4" style={{ color: dark(s, "white") ? "#fff" : theme.ink }}>
                {(() => { const l = dark(s, "white") ? theme.logoOnDark : theme.logoOnLight; return l ? <img src={l.url} alt={theme.name} style={{ filter: l.filter }} className="h-7 w-auto" /> : T(s, "heading", "text-[16px] font-bold"); })()}
                {mobile ? null : <div className="ml-auto flex gap-6 text-[13px] opacity-75">{s.items.map((i) => <span key={i.title}>{i.title}</span>)}</div>}
                <span className={mobile ? "ml-auto" : ""}>{btn(false)}</span>
              </div>, { background: bgOf(s, "white") });
          case "hero":
            return wrap(
              <div className={`grid items-center gap-10 px-[6%] ${mobile ? "" : "grid-cols-2"}`} style={pad(s)}>
                <div>
                  {T(s, "kicker", "mb-4 block text-[11px] font-bold tracking-[0.2em] uppercase", { color: theme.accent })}
                  {T(s, "heading", "block", h(s, 52))}
                  {T(s, "body", "mt-5 block text-[15px] leading-relaxed opacity-75")}
                  <div className="mt-7">{btn(true)}</div>
                </div>
                {s.image ? <img src={s.image} alt="" className="aspect-[4/3] w-full object-cover" /> : null}
              </div>, { background: bgOf(s, "paper"), color: dark(s, "paper") ? "#fff" : theme.ink });
          case "overlay":
            return wrap(
              <div className="relative" style={{ minHeight: mobile ? 360 : 520 }}>
                {s.image ? <img src={s.image} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
                <div className="absolute inset-0" style={{ background: `linear-gradient(90deg, ${theme.ink}e6 0%, ${theme.ink}99 45%, ${theme.ink}10 100%)` }} />
                <div className="relative px-[6%] text-white" style={{ ...pad(s, 110), maxWidth: mobile ? "100%" : 760 }}>
                  {T(s, "kicker", "mb-4 block text-[11px] font-bold tracking-[0.2em] uppercase", { color: theme.accent })}
                  {T(s, "heading", "block", h(s, 64))}
                  {T(s, "body", "mt-5 block max-w-[560px] text-[15px] leading-relaxed opacity-85")}
                  <div className="mt-8">{btn(true)}</div>
                </div>
              </div>, {});
          case "stats":
            return wrap(
              <div className={`grid gap-px px-[6%] ${mobile ? "grid-cols-2" : "grid-cols-4"}`} style={pad(s, 48)}>
                {s.items.map((it, n) => (
                  <div key={n} className="py-2 pr-4" style={{ borderLeft: `2px solid ${theme.accent}`, paddingLeft: 16 }}>
                    <EditText editable={editable} value={it.title} onChange={(v) => onEdit?.(s.id, { items: s.items.map((x, j) => (j === n ? { ...x, title: v } : x)) })} className="block" style={{ ...h(s, 40), fontWeight: 300 }} />
                    <EditText editable={editable} value={it.body} onChange={(v) => onEdit?.(s.id, { items: s.items.map((x, j) => (j === n ? { ...x, body: v } : x)) })} className="mt-2 block text-[12.5px] opacity-70" />
                  </div>
                ))}
              </div>, { background: bgOf(s, "ink"), color: dark(s, "ink") ? "#fff" : theme.ink });
          case "tabs":
            return wrap(
              <div className="px-[6%]" style={pad(s)}>
                {T(s, "kicker", "mb-3 block text-[11px] font-bold tracking-[0.2em] uppercase", { color: theme.accent })}
                {T(s, "heading", "block max-w-[680px]", h(s, 40))}
                <div className={`mt-10 grid gap-5 ${cols || (s.items.length >= 4 ? "grid-cols-4" : "grid-cols-3")}`}>
                  {s.items.map((it, n) => (
                    <div key={n} className="border-t-2 pt-5" style={{ borderColor: n === 0 ? theme.accent : `${theme.ink}22` }}>
                      <EditText editable={editable} value={it.title} onChange={(v) => onEdit?.(s.id, { items: s.items.map((x, j) => (j === n ? { ...x, title: v } : x)) })} className="block text-[17px] font-semibold" style={{ fontFamily: `"${theme.display}", sans-serif` }} />
                      <EditText editable={editable} value={it.body} onChange={(v) => onEdit?.(s.id, { items: s.items.map((x, j) => (j === n ? { ...x, body: v } : x)) })} className="mt-2 block text-[13.5px] leading-relaxed opacity-75" />
                    </div>
                  ))}
                </div>
              </div>, { background: bgOf(s, "white"), color: dark(s, "white") ? "#fff" : theme.ink });
          case "form":
            return wrap(
              <div className={`grid gap-10 px-[6%] ${mobile ? "" : "grid-cols-2"}`} style={pad(s)}>
                <div>
                  {T(s, "kicker", "mb-3 block text-[11px] font-bold tracking-[0.2em] uppercase", { color: theme.accent })}
                  {T(s, "heading", "block", h(s, 40))}
                  {T(s, "body", "mt-4 block text-[14.5px] opacity-75")}
                </div>
                <div className="space-y-3">
                  {["Name", "Email", "Phone", "How can we help?"].map((f) => <div key={f} className="border-b py-3 text-[13px] opacity-60" style={{ borderColor: "currentColor" }}>{f}</div>)}
                  <div className="pt-3">{btn(true)}</div>
                </div>
              </div>, { background: bgOf(s, "paper"), color: dark(s, "paper") ? "#fff" : theme.ink });
          case "calc":
            return wrap(
              <div className={`grid items-center gap-10 px-[6%] ${mobile ? "" : "grid-cols-2"}`} style={pad(s)}>
                <div>
                  {T(s, "kicker", "mb-3 block text-[11px] font-bold tracking-[0.2em] uppercase", { color: theme.accent })}
                  {T(s, "heading", "block", h(s, 40))}
                  {T(s, "body", "mt-4 block text-[14px] opacity-75")}
                </div>
                <div className="space-y-5 p-6" style={{ background: `${theme.ink}0d` }}>
                  {["Loan amount", "Term (months)"].map((l, n) => (
                    <div key={l}><p className="text-[12px] opacity-60">{l}</p><div className="mt-2 h-1.5 rounded-full" style={{ background: `${theme.ink}22` }}><div className="h-1.5 rounded-full" style={{ width: n ? "40%" : "60%", background: theme.accent }} /></div></div>
                  ))}
                  {btn(false)}
                </div>
              </div>, { background: bgOf(s, "white"), color: dark(s, "white") ? "#fff" : theme.ink });
          case "footer":
            return wrap(
              <div className={`flex gap-6 px-[6%] py-10 text-[12.5px] ${mobile ? "flex-col" : "items-center"}`}>
                {theme.logoOnDark ? <img src={theme.logoOnDark.url} alt="" style={{ filter: theme.logoOnDark.filter }} className="h-6 w-auto opacity-90" /> : T(s, "heading", "font-bold")}
                {T(s, "body", "opacity-60")}
                <div className={`flex gap-5 opacity-70 ${mobile ? "" : "ml-auto"}`}>{s.items.map((i) => <span key={i.title}>{i.title}</span>)}</div>
              </div>, { background: bgOf(s, "ink"), color: "#fff" });
        }
      })}
    </div>
  );
}

function EditText({ value, onChange, editable, className, style }: { value: string; onChange: (v: string) => void; editable: boolean; className?: string | undefined; style?: CSSProperties | undefined }) {
  if (!editable) return <span className={className} style={style}>{value}</span>;
  return (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => { const v = e.currentTarget.innerText; if (v !== value) onChange(v); }}
      className={`${className ?? ""} outline-none focus:bg-[#036C89]/10`}
      style={style}
    >
      {value}
    </span>
  );
}

/** Readable component source for Code mode, one file per section type. */
export function sectionCode(s: SiteSection): string {
  const name = SECTION_LABELS[s.type].replace(/[^A-Za-z]/g, "");
  const lines = [
    `export function ${name}() {`,
    `  return (`,
    `    <section className="${s.type}">`,
    s.kicker ? `      <p className="kicker">${s.kicker}</p>` : "",
    s.heading ? `      <h2>${s.heading}</h2>` : "",
    s.body ? `      <p>${s.body}</p>` : "",
    ...s.items.map((i) => `      <Item title="${i.title}">${i.body}</Item>`),
    s.cta ? `      <Button>${s.cta}</Button>` : "",
    `    </section>`,
    `  );`,
    `}`,
  ];
  return lines.filter(Boolean).join("\n");
}
