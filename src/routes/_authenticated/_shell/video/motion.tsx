import { createFileRoute } from "@tanstack/react-router";

import { noindex, SimpleScreen } from "@/components/shell/SimpleScreen";

export const Route = createFileRoute("/_authenticated/_shell/video/motion")({
  head: () => noindex("Motion Graphics", "Animated title cards, logo stings and lower thirds."),
  component: () => (
    <SimpleScreen
      title="Motion Graphics"
      sub="Animated title cards, logo stings and lower thirds."
      cta="New animation"
      agent={{ title: "Animating title cards for the Nine Elms walkthrough", steps: [["Logo sting", "done"], ["Title cards (4)", "run"], ["Lower thirds", "todo"]] }}
      items={[{ label: "Logo sting", meta: "0:04" }, { label: "Title card — Nine Elms", meta: "0:03" }, { label: "Lower third", meta: "0:05" }, { label: "End card", meta: "0:04" }]}
    />
  ),
});
