import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { getBrandBrain, type BrandBrain } from "@/lib/brand.functions";
import { useSelectedBrandId } from "@/lib/brandSelection";
import type { EmailTheme } from "./EmailPreview";

/** The selected brand plus the email colours derived from its brand kit. */
export function useEmailBrand() {
  const { brandId, ready } = useSelectedBrandId();
  const loadBrain = useServerFn(getBrandBrain);
  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    loadBrain({ data: brandId ? { brandId } : {} })
      .then(setBrain)
      .catch(() => setBrain(null))
      .finally(() => setLoading(false));
  }, [ready, brandId, loadBrain]);
  const p = brain?.palette ?? [];
  const lum = (h: string) => {
    const n = parseInt(h.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
    return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  };
  // Accent must read on the dark header: pick the first mid-bright brand colour.
  const accent = p.slice(1).find((c) => c.hex && lum(c.hex) > 0.35 && lum(c.hex) < 0.9)?.hex;
  const theme: EmailTheme = {
    name: brain?.name ?? "Your brand",
    logoUrl: brain?.logoUrl ?? null,
    ink: p[0]?.hex || "#13241C",
    accent: accent || "#B89A3E",
    paper: "#F4F1EC",
  };
  return { brain, loading, theme };
}
