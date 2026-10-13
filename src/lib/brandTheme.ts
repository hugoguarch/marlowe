import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";

import { getBrandBrain, type BrandBrain } from "@/lib/brand.functions";
import { useSelectedBrandId } from "@/lib/brandSelection";

export type BrandTheme = {
  name: string;
  logoUrl: string | null;
  ink: string;
  deep: string;
  accent: string;
  paper: string;
  display: string;
  body: string;
  /** True when an uploaded font file backs the family; false means the web version stands in. */
  displayUploaded: boolean;
  bodyUploaded: boolean;
  /** Logo to place on light and on dark backgrounds; `invert` means recolour it with a CSS filter. */
  logoOnLight: { url: string; filter: string } | null;
  logoOnDark: { url: string; filter: string } | null;
};

const lum = (h: string) => {
  const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function themeFrom(brain: BrandBrain | null, tones: Record<string, "light" | "dark"> = {}): BrandTheme {
  const p = (brain?.palette ?? []).filter((c) => /^#[0-9a-f]{6}$/i.test(c.hex));
  const byDark = [...p].sort((a, b) => lum(a.hex) - lum(b.hex));
  const ink = byDark[0]?.hex ?? "#001C26";
  const deep = byDark[1] && lum(byDark[1].hex) < 0.35 ? byDark[1].hex : ink;
  const accent = p.find((c) => lum(c.hex) > 0.3 && lum(c.hex) < 0.85 && c.hex !== ink)?.hex ?? "#036C89";
  const paper = [...p].reverse().find((c) => lum(c.hex) > 0.88)?.hex ?? "#F7F4F0";
  const fonts = (brain?.assets ?? []).filter((a) => a.kind === "font");
  const has = (fam: string) => !!fam && fonts.some((f) => norm(f.file_name ?? "").includes(norm(fam)));
  const display = brain?.typography.headline?.trim() || "Helvetica Neue";
  const body = brain?.typography.body?.trim() || display;
  const logos = (brain?.assets ?? []).filter((a) => a.kind === "logo" && a.url);
  const isLight = (l: { file_name: string | null; url: string | null }) =>
    tones[l.url ?? ""] ? tones[l.url ?? ""] === "light" : /white|wht|reverse|negative|knockout|mono-?w/i.test(l.file_name ?? "");
  const darkL = logos.find((l) => !isLight(l));
  const lightL = logos.find((l) => isLight(l));
  const any = logos[0]?.url ?? brain?.logoUrl ?? null;
  const logoOnLight = darkL ? { url: darkL.url!, filter: "" } : lightL ? { url: lightL.url!, filter: "brightness(0)" } : any ? { url: any, filter: "" } : null;
  const logoOnDark = lightL ? { url: lightL.url!, filter: "" } : any ? { url: (darkL ?? logos[0])?.url ?? any, filter: "brightness(0) invert(1)" } : null;
  return { logoOnLight, logoOnDark, name: brain?.name ?? "Your brand", logoUrl: brain?.logoUrl ?? null, ink, deep, accent, paper, display, body, displayUploaded: has(display), bodyUploaded: has(body) };
}

/** Measures each logo's pixels to tell white/reversed logos from dark ones. */
export function useLogoTones(brain: BrandBrain | null) {
  const [tones, setTones] = useState<Record<string, "light" | "dark">>({});
  useEffect(() => {
    const urls = (brain?.assets ?? []).filter((a) => a.kind === "logo" && a.url).map((a) => a.url!);
    let off = false;
    urls.forEach((url) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = 48; c.height = 48;
          const x = c.getContext("2d")!;
          x.drawImage(img, 0, 0, 48, 48);
          const d = x.getImageData(0, 0, 48, 48).data;
          let sum = 0, n = 0;
          for (let i = 0; i < d.length; i += 4) if (d[i + 3]! > 40) { sum += 0.299 * d[i]! + 0.587 * d[i + 1]! + 0.114 * d[i + 2]!; n++; }
          // Fully opaque images (no transparency) are judged by their content, not their background.
          if (!off && n && n < 48 * 48 * 0.95) setTones((t) => ({ ...t, [url]: sum / n > 190 ? "light" : "dark" }));
        } catch { /* cross-origin images fall back to file-name rules */ }
      };
      img.src = url;
    });
    return () => { off = true; };
  }, [brain]);
  return tones;
}

/** Loads uploaded brand fonts (and the web version of each family as a fallback) into the page. */
export function useBrandFonts(brain: BrandBrain | null) {
  useEffect(() => {
    if (!brain) return;
    const t = themeFrom(brain);
    const id = `brand-fonts-${brain.brandId}`;
    document.getElementById(id)?.remove();
    const el = document.createElement("style");
    el.id = id;
    const faces = brain.assets
      .filter((a) => a.kind === "font" && a.url)
      .map((a) => {
        const n = norm(a.file_name ?? "");
        const fam = n.includes(norm(t.display)) ? t.display : n.includes(norm(t.body)) ? t.body : null;
        if (!fam) return "";
        const w = /extrabold|black|heavy/.test(n) ? 800 : /bold/.test(n) ? 700 : /semi|medium/.test(n) ? 500 : /light|thin/.test(n) ? 300 : 400;
        return `@font-face{font-family:"${fam}";font-weight:${w};src:url("${a.url}");font-display:swap}`;
      })
      .join("\n");
    el.textContent = faces;
    document.head.appendChild(el);
    const fams = [t.display, t.body].filter((f, i, a) => f && a.indexOf(f) === i && f !== "Helvetica Neue");
    const links = fams.map((f) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(f)}:wght@300;400;500;700;800&display=swap`;
      l.dataset["brandFont"] = brain.brandId;
      document.head.appendChild(l);
      return l;
    });
    return () => {
      el.remove();
      links.forEach((l) => l.remove());
    };
  }, [brain]);
}

/** The selected account's brand kit, its derived theme, and its fonts loaded. */
export function useBrandTheme() {
  const { brandId, ready } = useSelectedBrandId();
  const load = useServerFn(getBrandBrain);
  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(async () => {
    const b = await load({ data: brandId ? { brandId } : {} }).catch(() => null);
    setBrain(b);
    return b;
  }, [brandId, load]);
  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    reload().finally(() => setLoading(false));
  }, [ready, reload]);
  useBrandFonts(brain);
  const tones = useLogoTones(brain);
  const theme = useMemo(() => themeFrom(brain, tones), [brain, tones]);
  return { brain, setBrain, theme, loading, reload };
}
