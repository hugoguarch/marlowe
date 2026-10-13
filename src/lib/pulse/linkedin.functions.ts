/** LinkedIn Company Page connections. Admin-only; tokens never leave the server. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function mustAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("pulse_is_admin", { _uid: ctx.userId });
  if (!data) throw new Error("Only admins can manage connections");
}

export const linkedinConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const l = await import("./linkedin.server");
    if (!l.allowedOrigin(data.origin)) throw new Error("This address can't be used for LinkedIn sign-in");
    return { url: l.linkedinAuthUrl(data.origin, await l.signState({ c: data.clientId, o: data.origin, p: "linkedin" })) };
  });

export const linkedinAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await mustAdmin(context);
    const l = await import("./linkedin.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("pulse_linkedin_accounts").select("id, name, expires_at").order("name");
    return Promise.all((data ?? []).map(async (a) => {
      try {
        const { tok } = await l.linkedinToken(a.id);
        return { id: a.id, name: a.name ?? "LinkedIn", expiresAt: a.expires_at, orgs: await l.adminOrgs(tok), error: null as string | null };
      } catch (e) {
        return { id: a.id, name: a.name ?? "LinkedIn", expiresAt: a.expires_at, orgs: [] as { id: string; name: string }[], error: e instanceof Error ? e.message : "Failed" };
      }
    }));
  });

const conn = z.object({ clientId: z.string().uuid(), ref: z.string().min(1).max(200) });

export const addLinkedInConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.extend({ accountId: z.string().uuid(), name: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.from("pulse_connections").upsert(
      { client_id: data.clientId, provider: "linkedin", account_ref: data.ref, account_name: data.name, oauth_account_id: data.accountId, status: "connected" },
      { onConflict: "client_id,provider,account_ref" },
    );
    if (up.error) throw new Error(up.error.message);
    const { syncLinkedInConnection } = await import("./linkedin.server");
    const r = await syncLinkedInConnection(data.clientId, data.ref);
    if (r !== "ok") throw new Error(`Linked, but first sync failed: ${r}`);
    return { ok: true };
  });

export const resyncLinkedIn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { syncLinkedInConnection } = await import("./linkedin.server");
    const r = await syncLinkedInConnection(data.clientId, data.ref);
    if (r !== "ok") throw new Error(r);
    return { ok: true };
  });

export const removeLinkedInConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pulse_connections").delete().eq("client_id", data.clientId).eq("provider", "linkedin").eq("account_ref", data.ref);
    await supabaseAdmin.from("pulse_metrics_daily").delete().eq("client_id", data.clientId).eq("channel", "linkedin").eq("site", data.ref);
    const { count } = await supabaseAdmin.from("pulse_connections").select("account_ref", { count: "exact", head: true }).eq("client_id", data.clientId).eq("provider", "linkedin");
    if (!count) await supabaseAdmin.from("pulse_posts").delete().eq("client_id", data.clientId).eq("channel", "linkedin");
    return { ok: true };
  });
