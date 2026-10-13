import { createFileRoute, notFound } from "@tanstack/react-router";

import { SitePage, type SiteSection } from "@/components/site/SitePage";
import type { BrandBrain } from "@/lib/brand.functions";
import { themeFrom, useBrandFonts, useLogoTones } from "@/lib/brandTheme";
import { getPublishedPage } from "@/lib/site.functions";

export const Route = createFileRoute("/site/$brandId/$slug")({
  loader: async ({ params }) => {
    const page = await getPublishedPage({ data: { brandId: params.brandId, slug: params.slug } });
    if (!page) throw notFound();
    return page;
  },
  head: ({ loaderData }) => {
    const title = loaderData ? `${loaderData.title} · ${loaderData.brand.name}` : "Page unavailable";
    const desc = loaderData ? `${loaderData.title} from ${loaderData.brand.name}.` : "This page isn't published.";
    return {
      meta: [
        { title }, { name: "description", content: desc },
        { property: "og:title", content: title }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        ...(loaderData ? [] : [{ name: "robots", content: "noindex" }]),
      ],
    };
  },
  notFoundComponent: () => <div className="flex min-h-screen items-center justify-center text-[15px] text-ink-navy/60">This page isn't published.</div>,
  component: PublishedSite,
});

function PublishedSite() {
  const d = Route.useLoaderData();
  const brain = { brandId: "public", name: d.brand.name, logoUrl: d.brand.logoUrl, palette: d.brand.palette, typography: { headline: d.brand.typography.headline ?? "", body: d.brand.typography.body ?? "", notes: "" }, assets: d.brand.logos } as unknown as BrandBrain;
  useBrandFonts(brain);
  const tones = useLogoTones(brain);
  return <SitePage sections={JSON.parse(d.sectionsJson) as SiteSection[]} theme={themeFrom(brain, tones)} />;
}
