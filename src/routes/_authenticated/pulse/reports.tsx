import { createFileRoute } from "@tanstack/react-router";

import { Upcoming } from "@/components/pulse/Upcoming";

export const Route = createFileRoute("/_authenticated/pulse/reports")({
  head: () => ({ meta: [{ title: "Reports — Pulse" }, { name: "description", content: "Reports in Pulse." }] }),
  component: () => <Upcoming title="Reports" stage="stage 4" items={["Monthly, Quarterly, AI Visibility and Social templates", "Claude narrative from the numbers only", "PDF and email delivery", "Auto-drafts on the 1st"]} />,
});
