import { usePulse } from "./context";
import { Empty, PageTitle, Panel } from "./ui";

/** Honest placeholder for sections built in later stages. */
export function Upcoming({ title, stage, items }: { title: string; stage: string; items: string[] }) {
  const { client, clientId } = usePulse();
  return (
    <div className="space-y-6">
      <PageTitle title={title} sub={clientId === "all" ? "All clients" : client?.name} />
      <Panel title={`Arrives in ${stage}`}>
        <Empty title="Not built yet" body="This section is scaffolded so navigation is in place. Here is what it will contain:" />
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {items.map((i) => (
            <li key={i} className="rounded-lg border border-p-line px-3 py-2 text-sm text-p-muted">{i}</li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
