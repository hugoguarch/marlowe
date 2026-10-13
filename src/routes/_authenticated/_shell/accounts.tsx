import { createFileRoute, Link } from "@tanstack/react-router";

import { usePulse } from "@/components/pulse/context";
import { noindex } from "@/components/shell/SimpleScreen";
import { Badge, btnGhost, CardHead, EmptyState, Skeleton, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/accounts")({
  head: () => noindex("Accounts", "Every account you manage and its connected channels."),
  component: Accounts,
});

function Accounts() {
  const { session, loading, setClientId, clientId } = usePulse();
  const list = (session?.clients ?? []).filter((c) => c.status !== "archived");
  return (
    <div className="space-y-6">
      <Title title="Accounts" sub={`${list.length} account${list.length === 1 ? "" : "s"}`} action={<Link to="/settings/data-sources" className={btnGhost}>Manage connections</Link>} />
      <WmCard>
        <CardHead title="All accounts" />
        {loading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : list.length ? (
          list.map((c) => (
            <div key={c.id} className="flex items-center gap-4 border-b border-app-line px-5 py-3.5 last:border-0">
              <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-ink-navy text-[11px] font-bold text-white">{c.name.slice(0, 2).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px]">{c.name}</p>
                <p className="text-[12px] text-ink-navy/55">{c.sector}</p>
              </div>
              <span className="text-[12.5px] text-ink-navy/55">{new Set(c.connections.map((x) => x.provider)).size} channels</span>
              {c.id === clientId ? <Badge tone="cerulean">Current</Badge> : <button onClick={() => setClientId(c.id)} className={btnGhost}>Switch</button>}
            </div>
          ))
        ) : (
          <EmptyState title="No accounts yet" body="Accounts you're given access to appear here." />
        )}
      </WmCard>
    </div>
  );
}
