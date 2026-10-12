import { createFileRoute } from "@tanstack/react-router";

/** Nightly data refresh, called by the scheduler. Idempotent: only re-pulls data from the providers. */
export const Route = createFileRoute("/api/public/hooks/pulse-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace("Bearer ", "");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });
        const { syncAllDue } = await import("@/lib/pulse/gsc.server");
        const gsc = await syncAllDue();
        const { syncAllMeta } = await import("@/lib/pulse/meta-sync.server");
        const meta = await syncAllMeta().catch((e) => ({ error: String(e) }));
        const { syncAllGoogle } = await import("@/lib/pulse/google.server");
        const google = await syncAllGoogle().catch((e) => ({ error: String(e) }));
        return Response.json({ ok: true, gsc, meta, google });
      },
    },
  },
});
