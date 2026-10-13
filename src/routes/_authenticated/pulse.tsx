import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// Pulse is no longer a separate platform; its old addresses forward into the app.
const MAP: Record<string, string> = {
  "/pulse": "/marketing/analytics",
  "/pulse/social": "/marketing/social",
  "/pulse/ai-search": "/web/ai-search",
  "/pulse/settings": "/settings/data-sources",
};

export const Route = createFileRoute("/_authenticated/pulse")({
  beforeLoad: ({ location }) => {
    const p = location.pathname.replace(/\/$/, "");
    throw redirect({ href: MAP[p] ?? p.replace(/^\/pulse/, "/marketing/analytics"), replace: true });
  },
  component: () => <Outlet />,
});
