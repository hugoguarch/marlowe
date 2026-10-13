import { createFileRoute } from "@tanstack/react-router";

import { noindex, SimpleScreen } from "@/components/shell/SimpleScreen";

export const Route = createFileRoute("/_authenticated/_shell/video/library")({
  head: () => noindex("Footage Library", "Every clip the team has shot, tagged automatically by the agent."),
  component: () => (
    <SimpleScreen
      title="Footage Library"
      sub="Every clip the team has shot, tagged automatically by the agent."
      cta="Upload footage"
      agent={{ title: "Tagging 42 new clips from the site visit", steps: [["Uploaded 42 clips", "done"], ["Tagging scenes and people", "run"], ["Selecting best takes", "todo"]] }}
      items={[{ label: "Aerial — river frontage", meta: "0:38 · 4K" }, { label: "Facade detail", meta: "0:21 · 4K" }, { label: "Westminster skyline", meta: "0:44 · 4K" }, { label: "City at dusk", meta: "1:02 · 4K" }]}
    />
  ),
});
