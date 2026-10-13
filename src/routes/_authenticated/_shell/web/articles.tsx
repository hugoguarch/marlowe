import { createFileRoute } from "@tanstack/react-router";

import { noindex, SimpleScreen } from "@/components/shell/SimpleScreen";

export const Route = createFileRoute("/_authenticated/_shell/web/articles")({
  head: () => noindex("Articles", "Long-form articles written for search and AI answers."),
  component: () => (
    <SimpleScreen
      title="Articles"
      sub="Long-form articles written for search and AI answers."
      cta="Generate article"
      agent={{ title: "Writing 2 articles for the Nine Elms launch", steps: [["Keyword and prompt research", "done"], ["Drafting article 1", "run"], ["Drafting article 2", "todo"]] }}
      items={[{ label: "Living in Nine Elms: a guide", meta: "Draft · 1,840 words" }, { label: "Prime London rents in Q3", meta: "Published · 1,220 words" }, { label: "Westminster commute times", meta: "In review" }, { label: "Retrofit: the next five years", meta: "Published" }]}
    />
  ),
});
