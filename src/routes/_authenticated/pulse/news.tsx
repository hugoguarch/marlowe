import { createFileRoute } from "@tanstack/react-router";

import { Upcoming } from "@/components/pulse/Upcoming";

export const Route = createFileRoute("/_authenticated/pulse/news")({
  head: () => ({ meta: [{ title: "News — Pulse" }, { name: "description", content: "News in Pulse." }] }),
  component: () => <Upcoming title="News" stage="stage 6" items={["Keyword watchlist per client", "Ranked Google News feed", "Turn into a post"]} />,
});
