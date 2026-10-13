import { createFileRoute } from "@tanstack/react-router";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><title>${title}</title><body style="font-family:Helvetica Neue,Arial;padding:48px;color:#001C26"><h2>${title}</h2><p>${body}</p><p>You can close this tab and return to Pulse.</p><script>try{window.opener&&window.opener.postMessage("pulse-google-connected",location.origin);setTimeout(function(){window.close()},1500)}catch(e){}</script></body>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]!);

/** Google OAuth return. The signed, expiring state proves an admin started this from Pulse. */
export const Route = createFileRoute("/api/public/oauth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const code = u.searchParams.get("code"), state = u.searchParams.get("state");
        if (u.searchParams.get("error")) return page("Google sign-in cancelled", esc(u.searchParams.get("error")!));
        if (!code || !state) return page("Something went wrong", "Missing sign-in details.");
        const g = await import("@/lib/pulse/google.server");
        const s = await g.verifyState(state);
        if (!s) return page("Link expired", "Start the connection again from Settings.");
        try {
          const { email, accountId, accessToken } = await g.finishOAuth(code, s.o);
          // YouTube channels on this sign-in are linked to the client straight away.
          const channels = s.p === "gbp" ? [] : await g.youtubeChannels(accessToken).catch(() => []);
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          for (const c of channels) {
            await supabaseAdmin.from("pulse_connections").upsert({ client_id: s.c, provider: "youtube", account_ref: c.id, account_name: c.name, oauth_account_id: accountId, status: "connected" }, { onConflict: "client_id,provider,account_ref" });
            await g.syncGoogleConnection(s.c, "youtube", c.id);
          }
          return page("Google account connected", `${esc(email)} is connected.${channels.length ? ` Linked YouTube: ${channels.map((c) => esc(c.name)).join(", ")}.` : ""}${s.p === "youtube" ? "" : " Pick Business Profile locations in Settings."}`);
        } catch (e) {
          return page("Couldn't connect", esc(e instanceof Error ? e.message : "Unknown error"));
        }
      },
    },
  },
});
