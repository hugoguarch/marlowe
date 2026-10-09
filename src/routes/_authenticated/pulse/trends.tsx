import { createFileRoute } from "@tanstack/react-router";

import { Upcoming } from "@/components/pulse/Upcoming";

export const Route = createFileRoute("/_authenticated/pulse/trends")({
  head: () => ({ meta: [{ title: "Trends & Ideas — Pulse" }, { name: "description", content: "Trends & Ideas in Pulse." }] }),
  component: () => <Upcoming title="Trends & Ideas" stage="stage 6" items={["Sector trending topics with momentum", "Best format, day and time", "Claude content idea cards", "Save to backlog"]} />,
});
