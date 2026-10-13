import { IMAGES } from "@/components/shell/SimpleScreen";

export type EmailBlock =
  | { id: string; type: "header"; label: string }
  | { id: string; type: "hero"; image: string; kicker: string; title: string; accent: string }
  | { id: string; type: "text"; body: string }
  | { id: string; type: "figures"; items: { v: string; l: string }[] }
  | { id: string; type: "button"; label: string; secondary: string }
  | { id: string; type: "articles"; heading: string; items: { title: string; image: string }[] }
  | { id: string; type: "footer"; text: string };

export type EmailTheme = { name: string; logoUrl: string | null; ink: string; accent: string; paper: string };

const uid = () => Math.random().toString(36).slice(2, 10);

export function newBlock(type: EmailBlock["type"]): EmailBlock {
  const id = uid();
  switch (type) {
    case "header": return { id, type, label: "NEWSLETTER" };
    case "hero": return { id, type, image: IMAGES[0]!, kicker: "LATEST · UPDATE", title: "A headline worth opening", accent: "opening" };
    case "text": return { id, type, body: "Hi {{first_name}},\n\nWrite the story here. Keep it short, specific and useful." };
    case "figures": return { id, type, items: [{ v: "£4.2M", l: "LOAN" }, { v: "70%", l: "LTV" }, { v: "9 days", l: "TO COMPLETION" }] };
    case "button": return { id, type, label: "Speak to an Expert", secondary: "Read the case study" };
    case "articles": return { id, type, heading: "LATEST INSIGHTS", items: [{ title: "Market note", image: IMAGES[1]! }, { title: "Case study", image: IMAGES[3]! }] };
    case "footer": return { id, type, text: "You're receiving this because you asked to hear from us. Unsubscribe any time." };
  }
}

export const DEFAULT_BLOCKS = (): EmailBlock[] => (["header", "hero", "text", "figures", "button", "articles", "footer"] as const).map(newBlock);

function Accent({ text, accent, color }: { text: string; accent: string; color: string }) {
  const i = accent ? text.toLowerCase().lastIndexOf(accent.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<span style={{ color }}>{text.slice(i, i + accent.length)}</span>{text.slice(i + accent.length)}</>;
}

/** Renders an email the way it lands in the inbox, on the account's brand colours. */
export function EmailPreview({ blocks, theme, mobile = false, selected, onSelect }: { blocks: EmailBlock[]; theme: EmailTheme; mobile?: boolean; selected?: string | null; onSelect?: (id: string) => void }) {
  const w = mobile ? 375 : 600;
  const pad = mobile ? 20 : 26;
  return (
    <div style={{ width: w, maxWidth: "100%", background: "#fff", fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', color: "#1d2a30", boxShadow: "0 24px 60px rgba(0,28,38,0.14)" }}>
      {blocks.map((b) => {
        const sel = selected === b.id;
        const wrap = (children: React.ReactNode, style: React.CSSProperties = {}) => (
          <div key={b.id} onClick={onSelect ? () => onSelect(b.id) : undefined} style={{ position: "relative", cursor: onSelect ? "pointer" : undefined, outline: sel ? "2px solid #036C89" : undefined, outlineOffset: -2, ...style }}>{children}</div>
        );
        switch (b.type) {
          case "header":
            return wrap(
              <div style={{ display: "flex", alignItems: "center", padding: `22px ${pad}px` }}>
                {theme.logoUrl ? <img src={theme.logoUrl} alt={theme.name} style={{ height: 30, width: "auto" }} /> : <span style={{ color: "#fff", fontSize: 20, letterSpacing: "0.12em", fontWeight: 300 }}>{theme.name.toUpperCase()}</span>}
                <span style={{ marginLeft: "auto", color: theme.accent, fontSize: 10, letterSpacing: "0.22em", fontWeight: 700 }}>{b.label}</span>
              </div>,
              { background: theme.ink },
            );
          case "hero":
            return wrap(
              <div style={{ position: "relative", height: mobile ? 240 : 212, backgroundImage: `url(${b.image})`, backgroundSize: "cover", backgroundPosition: "center" }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,20,26,0.85) 100%)" }} />
                <div style={{ position: "absolute", left: pad, right: pad, bottom: 22 }}>
                  <p style={{ display: "flex", alignItems: "center", gap: 8, color: theme.accent, fontSize: 9, letterSpacing: "0.24em", fontWeight: 700 }}><span style={{ width: 22, height: 1.5, background: theme.accent }} />{b.kicker}</p>
                  <p style={{ marginTop: 8, color: "#fff", fontSize: mobile ? 24 : 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: "-0.01em" }}><Accent text={b.title} accent={b.accent} color={theme.accent} /></p>
                </div>
              </div>,
            );
          case "text":
            return wrap(<div style={{ padding: `26px ${pad}px 6px`, fontSize: 13, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{b.body.replace("{{first_name}}", "James")}</div>);
          case "figures":
            return wrap(
              <div style={{ padding: `18px ${pad}px` }}>
                <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, b.items.length)}, 1fr)`, background: theme.ink }}>
                  {b.items.map((f, i) => (
                    <div key={i} style={{ padding: "16px 14px", borderLeft: i ? "1px solid rgba(255,255,255,0.12)" : undefined }}>
                      <p style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{f.v}</p>
                      <p style={{ marginTop: 4, color: theme.accent, fontSize: 8.5, letterSpacing: "0.2em", fontWeight: 700 }}>{f.l}</p>
                    </div>
                  ))}
                </div>
              </div>,
            );
          case "button":
            return wrap(
              <div style={{ display: "flex", alignItems: "center", gap: 14, padding: `8px ${pad}px 26px`, flexWrap: "wrap" }}>
                <span style={{ background: theme.accent, color: "#fff", padding: "11px 18px", fontSize: 12.5, fontWeight: 500 }}>{b.label}</span>
                {b.secondary ? <span style={{ fontSize: 11.5, borderBottom: "1px solid currentColor" }}>{b.secondary}</span> : null}
              </div>,
            );
          case "articles":
            return wrap(
              <div style={{ padding: `22px ${pad}px`, background: theme.paper }}>
                <p style={{ display: "flex", alignItems: "center", gap: 8, color: theme.accent, fontSize: 9, letterSpacing: "0.24em", fontWeight: 700 }}><span style={{ width: 22, height: 1.5, background: theme.accent }} />{b.heading}</p>
                <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                  {b.items.map((a, i) => (
                    <div key={i} style={{ background: "#fff" }}>
                      <div style={{ height: 110, backgroundImage: `url(${a.image})`, backgroundSize: "cover", backgroundPosition: "center" }} />
                      <p style={{ padding: "10px 12px", fontSize: 12.5, fontWeight: 500 }}>{a.title}</p>
                    </div>
                  ))}
                </div>
              </div>,
            );
          case "footer":
            return wrap(<div style={{ padding: `20px ${pad}px`, background: theme.ink, color: "rgba(255,255,255,0.6)", fontSize: 10.5, lineHeight: 1.6 }}>{b.text}</div>);
        }
      })}
    </div>
  );
}
