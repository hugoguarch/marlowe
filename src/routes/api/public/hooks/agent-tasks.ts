import { createFileRoute } from "@tanstack/react-router";

import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

/** Hourly task runner: runs the agent's due scheduled tasks (reports on the 1st, recurring posts, etc.). */
export const Route = createFileRoute("/api/public/hooks/agent-tasks")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;
        const { runDueTasks } = await import("@/lib/agent/agent.server");
        const r = await runDueTasks().catch((e) => ({ error: String(e) }));
        return Response.json({ ok: true, ...r });
      },
    },
  },
});
