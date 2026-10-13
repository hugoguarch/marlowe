import { createFileRoute } from "@tanstack/react-router";

const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);
const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:Helvetica Neue,Arial;padding:48px;color:#001C26"><h2>${title}</h2><p>${body}</p><p>You can close this window and return to Pulse.</p><script>try{window.opener&&window.opener.postMessage("pulse-linkedin-connected",location.origin);setTimeout(function(){window.close()},1500)}catch(e){}</script></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

/** LinkedIn OAuth return. The signed, expiring state proves an admin started this from Pulse. */
export const Route = createFileRoute("/api/public/oauth/linkedin/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        if (u.searchParams.get("error")) return page("LinkedIn sign-in cancelled", esc(u.searchParams.get("error_description") ?? u.searchParams.get("error")!));
        const code = u.searchParams.get("code"), state = u.searchParams.get("state");
        if (!code || !state) return page("Something went wrong", "Missing sign-in details.");
        const l = await import("@/lib/pulse/linkedin.server");
        const s = await l.verifyState(state);
        if (!s || s.p !== "linkedin") return page("Link expired", "Start the connection again from Settings.");
        try {
          const { orgs } = await l.finishLinkedIn(code, s.o);
          return page("LinkedIn connected", orgs.length ? `Company Pages available: ${orgs.map((o) => esc(o.name)).join(", ")}. Pick one in Settings.` : "This sign-in isn't an admin of any Company Page.");
        } catch (e) {
          return page("Couldn't connect", esc(e instanceof Error ? e.message : "Unknown error"));
        }
      },
    },
  },
});
