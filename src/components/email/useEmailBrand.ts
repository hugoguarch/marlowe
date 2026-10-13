import { useBrandTheme } from "@/lib/brandTheme";
import type { EmailTheme } from "./EmailPreview";

/** The selected brand plus the email colours derived from its brand kit. */
export function useEmailBrand() {
  const { brain, loading, theme: t } = useBrandTheme();
  const theme: EmailTheme = { name: t.name, logoUrl: t.logoUrl, ink: t.ink, accent: t.accent, paper: t.paper };
  return { brain, loading, theme, brandTheme: t };
}
