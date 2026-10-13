import { createFileRoute, Outlet } from "@tanstack/react-router";

import { RouteTabs, Title } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Why Media AI" },
      { name: "description", content: "Workspace settings and data sources for every account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <div className="space-y-6">
      <Title title="Settings" sub="Your workspace, and the channels each account is connected to." />
      <RouteTabs tabs={[{ label: "Workspace", to: "/settings", exact: true }, { label: "Data sources", to: "/settings/data-sources" }]} />
      <div className="pulse-embed"><Outlet /></div>
    </div>
  ),
});
