/** Which brand the workspace is currently looking at. Browser-side only. */
import { useEffect, useState } from "react";

const KEY = "wm.selectedBrandId";
const EVENT = "wm.brandChanged";

export function getSelectedBrandId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY);
}

export function setSelectedBrandId(brandId: string | null) {
  if (typeof window === "undefined") return;
  if (brandId) window.localStorage.setItem(KEY, brandId);
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent(EVENT, { detail: brandId }));
}

/** null until hydrated, so pages don't fetch with a server-side guess. */
export function useSelectedBrandId() {
  const [brandId, setBrandId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setBrandId(getSelectedBrandId());
    setReady(true);
    const onChange = (e: Event) => setBrandId((e as CustomEvent).detail ?? null);
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  return { brandId, ready, select: setSelectedBrandId };
}
