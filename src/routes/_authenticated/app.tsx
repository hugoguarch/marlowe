import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

// Old Marlowe workspace addresses forward to their new homes.
const MAP: Record<string, string> = {
  "/app": "/dashboard",
  "/app/marlowe": "/agent",
  "/app/brand": "/design/brand",
  "/app/studio": "/marketing/scheduler",
  "/app/growth": "/marketing/analytics",
  "/app/settings": "/settings",
};

export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: ({ location }) => {
    throw redirect({ href: MAP[location.pathname.replace(/\/$/, "")] ?? "/dashboard", replace: true });
  },
  component: () => <Outlet />,
});
