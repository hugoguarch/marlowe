import { createFileRoute } from "@tanstack/react-router";

import { Upcoming } from "@/components/pulse/Upcoming";

export const Route = createFileRoute("/_authenticated/pulse/ai-search")({
  head: () => ({ meta: [{ title: "AI Search — Pulse" }, { name: "description", content: "AI Search in Pulse." }] }),
  component: () => <Upcoming title="AI Search" stage="stage 3" items={["Prompt discovery via DataForSEO", "Weekly prompt tracker across five engines", "Visibility score and share of voice", "Citation gaps and Claude recommendations"]} />,
});
