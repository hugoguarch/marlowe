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
  const theme: EmailTheme = {
    name: brain?.name ?? "Your brand",
    logoUrl: brain?.logoUrl ?? null,
    ink: p[0]?.hex || "#13241C",
    accent: p[1]?.hex || "#B89A3E",
    paper: "#F4F1EC",
  };
  return { brain, loading, theme };
}
