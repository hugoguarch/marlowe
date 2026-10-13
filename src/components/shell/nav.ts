import {
  Briefcase,
  Globe,
  Home,
  Megaphone,
  Palette,
  Settings,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; to: string };
export type Dept = { key: string; label: string; icon: LucideIcon; base: string; items: NavItem[] };

export const TOP: (NavItem & { icon: LucideIcon })[] = [
  { label: "Dashboard", to: "/dashboard", icon: Home },
  { label: "Agent", to: "/agent", icon: Sparkles },
];

export const DEPTS: Dept[] = [
  {
    key: "mkt",
    label: "Marketing",
    icon: Megaphone,
    base: "/marketing",
    items: [
      { label: "Social Overview", to: "/marketing/social" },
      { label: "Post Scheduler", to: "/marketing/scheduler" },
      { label: "Analytics & Reports", to: "/marketing/analytics" },
      { label: "Ad Manager", to: "/marketing/ads" },
      { label: "Email Marketing", to: "/marketing/email" },
    ],
  },
  {
    key: "design",
    label: "Design",
    icon: Palette,
    base: "/design",
    items: [
      { label: "Post Designer", to: "/design/post-designer" },
      { label: "Graphics", to: "/design/graphics" },
      { label: "Brand Guidelines", to: "/design/brand" },
      { label: "Email Designer", to: "/design/email-designer" },
    ],
  },
  {
    key: "video",
    label: "Video",
    icon: Video,
    base: "/video",
    items: [
      { label: "Auto-Edit Studio", to: "/video/studio" },
      { label: "Motion Graphics", to: "/video/motion" },
      { label: "Footage Library", to: "/video/library" },
    ],
  },
  {
    key: "web",
    label: "Web",
    icon: Globe,
    base: "/web",
    items: [
      { label: "AI Search & SEO", to: "/web/ai-search" },
      { label: "Site Builder", to: "/web/site-builder" },
      { label: "CMS", to: "/web/cms" },
      { label: "Articles", to: "/web/articles" },
      { label: "Bug Reports", to: "/web/bugs" },
    ],
  },
];

export const BOTTOM: (NavItem & { icon: LucideIcon })[] = [
  { label: "Accounts", to: "/accounts", icon: Briefcase },
  { label: "Settings", to: "/settings", icon: Settings },
];

/** Breadcrumb (Department › Page) for a pathname. */
export function crumbs(path: string): [string, string] {
  for (const d of DEPTS) {
    const it = d.items.find((i) => path === i.to || path.startsWith(i.to + "/"));
    if (it) return [d.label, it.label];
  }
  const t = [...TOP, ...BOTTOM].find((i) => path.startsWith(i.to));
  return ["Why Media", t?.label ?? ""];
}
