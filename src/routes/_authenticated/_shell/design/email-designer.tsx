import { createFileRoute } from "@tanstack/react-router";

import { noindex, SimpleScreen } from "@/components/shell/SimpleScreen";

export const Route = createFileRoute("/_authenticated/_shell/design/email-designer")({
  head: () => noindex("Email Designer", "Reusable email templates built from the account's brand kit."),
  component: () => (
    <SimpleScreen
      title="Email Designer"
      sub="Reusable email templates built from the account's brand kit."
      cta="New template"
      agent={{ title: "Building a newsletter template from the brand kit", steps: [["Header and footer from brand kit", "done"], ["Article and deal blocks", "run"], ["Dark-mode check", "todo"]] }}
      items={[{ label: "Newsletter", meta: "6 blocks" }, { label: "Deal announcement", meta: "4 blocks" }, { label: "Event invite", meta: "5 blocks" }, { label: "Nurture step", meta: "3 blocks" }]}
    />
  ),
});
