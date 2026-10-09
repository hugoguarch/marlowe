import { createFileRoute } from "@tanstack/react-router";

import { Upcoming } from "@/components/pulse/Upcoming";

export const Route = createFileRoute("/_authenticated/pulse/competitors")({
  head: () => ({ meta: [{ title: "Competitors — Pulse" }, { name: "description", content: "Competitors in Pulse." }] }),
  component: () => <Upcoming title="Competitors" stage="stage 6" items={["Up to 3 competitors per client", "Benchmark table", "Competitor top posts", "Instagram Business Discovery"]} />,
});
