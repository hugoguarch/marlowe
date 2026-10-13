import { createFileRoute, Outlet } from "@tanstack/react-router";

import { usePulse } from "@/components/pulse/context";
import { RouteTabs, Title } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/marketing/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & Reports — Why Media AI" },
      { name: "description", content: "Performance across every channel, plus automatic client reports." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnalyticsLayout,
});

const TABS = [
  { label: "Overview", to: "/marketing/analytics", exact: true },
  { label: "Reports", to: "/marketing/analytics/reports" },
  { label: "Google Business", to: "/marketing/analytics/google-business" },
  { label: "Website & SEO", to: "/marketing/analytics/website" },
  { label: "Competitors", to: "/marketing/analytics/competitors" },
  { label: "Trends & Ideas", to: "/marketing/analytics/trends" },
  { label: "News", to: "/marketing/analytics/news" },
];

function AnalyticsLayout() {
  const { client, clientId } = usePulse();
  return (
    <div className="space-y-6">
      <Title title="Analytics & Reports" sub={clientId === "all" ? "Portfolio view across all accounts" : client?.name} />
      <RouteTabs tabs={TABS} />
      <div className="pulse-embed">
        <Outlet />
      </div>
    </div>
  );
}
