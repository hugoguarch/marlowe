import { createFileRoute } from "@tanstack/react-router";

import { noindex, SimpleScreen } from "@/components/shell/SimpleScreen";

export const Route = createFileRoute("/_authenticated/_shell/design/graphics")({
  head: () => noindex("Graphics", "Display ads, brochures and print artwork on each account's brand kit."),
  component: () => (
    <SimpleScreen
      title="Graphics"
      sub="Display ads, brochures and print artwork on each account's brand kit."
      cta="New graphic"
      agent={{ title: "Resizing the Q4 market update into 9 display formats", steps: [["Master artwork approved", "done"], ["Resizing to 9 formats", "run"], ["Export print PDF", "todo"]] }}
      items={[{ label: "Q4 market update — MPU", meta: "300×250" }, { label: "Leaderboard", meta: "728×90" }, { label: "Brochure cover", meta: "A4 print" }, { label: "Hoarding panel", meta: "6×3m" }]}
    />
  ),
});
