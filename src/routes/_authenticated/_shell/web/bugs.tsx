import { createFileRoute } from "@tanstack/react-router";

import { PreviewTag } from "@/components/shell/Preview";
import { noindex } from "@/components/shell/SimpleScreen";
import { Badge, btnDark, CardHead, Title, WmCard } from "@/components/shell/ui";

export const Route = createFileRoute("/_authenticated/_shell/web/bugs")({
  head: () => noindex("Bug Reports", "Issues found on client websites and what the agent is doing about them."),
  component: Bugs,
});

// TODO: wire to API — site crawler results.
const BUGS = [
  ["3 broken links on /developments", "Devine Group", "High", "Fixing"],
  ["Missing schema on property pages", "CLS", "Medium", "Queued"],
  ["Hero image 2.4MB on mobile", "Savills", "Medium", "Fixed"],
  ["robots.txt blocks GPTBot", "WSW Refurbishments", "High", "Needs approval"],
  ["Duplicate title tags (12 pages)", "Colecroft", "Low", "Queued"],
] as const;

function Bugs() {
  return (
    <div className="space-y-6">
      <Title title="Bug Reports" sub="Found by the nightly site crawl" action={<div className="flex gap-2"><PreviewTag /><button className={btnDark}>Report a bug</button></div>} />
      <WmCard>
        <CardHead title="Open issues" meta={`${BUGS.filter((b) => b[3] !== "Fixed").length} open`} />
        <table className="w-full text-[13.5px]">
          <thead className="text-left text-[12px] text-ink-navy/55">
            <tr className="border-b border-app-line"><th className="px-5 py-2.5 font-normal">Issue</th><th className="font-normal">Account</th><th className="font-normal">Severity</th><th className="pr-5 font-normal">Status</th></tr>
          </thead>
          <tbody>
            {BUGS.map(([t, a, s, st]) => (
              <tr key={t} className="border-b border-app-line last:border-0">
                <td className="px-5 py-3">{t}</td>
                <td>{a}</td>
                <td><Badge tone={s === "High" ? "ink" : "muted"}>{s}</Badge></td>
                <td className="pr-5"><Badge tone={st === "Fixed" ? "green" : st === "Fixing" ? "cerulean" : "muted"}>{st}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </WmCard>
    </div>
  );
}
