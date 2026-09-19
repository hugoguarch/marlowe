import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { useSelectedBrandId } from "@/lib/brandSelection";
import { listBrands } from "@/lib/brand.functions";

type Brand = { id: string; name: string; is_default: boolean };

/** Pick which brand the page is working on. */
export function BrandSwitcher({ current }: { current?: string | null }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const { select } = useSelectedBrandId();
  const all = useServerFn(listBrands);

  useEffect(() => {
    all()
      .then((list) => setBrands(list as Brand[]))
      .catch(() => {});
  }, [all]);

  if (brands.length < 2) return null;

  return (
    <label className="flex items-center gap-2">
      <span className="text-[0.6rem] tracking-[0.2em] text-ink-navy/40 uppercase">Brand</span>
      <select
        value={current ?? ""}
        onChange={(e) => select(e.target.value)}
        className="rounded-full border border-app-line bg-app-card px-4 py-2 text-xs tracking-[0.12em] text-ink-navy uppercase"
      >
        {brands.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
    </label>
  );
}
