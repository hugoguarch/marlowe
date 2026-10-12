/** YouTube + Google Business Profile connections. Admin-only; tokens never leave the server. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function mustAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc("pulse_is_admin", { _uid: ctx.userId });
  if (!data) throw new Error("Only admins can manage connections");
}

export const googleConnectUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const g = await import("./google.server");
    if (!g.allowedOrigin(data.origin)) throw new Error("This address can't be used for Google sign-in");
    return { url: g.authUrl(data.origin, await g.signState({ c: data.clientId, o: data.origin })) };
  });

export const googleAssets = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await mustAdmin(context);
    const g = await import("./google.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("pulse_google_accounts").select("id, email").order("email");
    return Promise.all((data ?? []).map(async (a) => {
      try {
        const tok = await g.accessToken(a.id);
        const [channels, locations] = await Promise.all([
          g.youtubeChannels(tok).catch(() => []),
          g.gbpLocations(tok).catch((e) => { console.warn("GBP locations failed", e instanceof Error ? e.message : e); return []; }),
        ]);
        return { id: a.id, email: a.email, channels, locations, error: null as string | null };
      } catch (e) {
        return { id: a.id, email: a.email, channels: [], locations: [], error: e instanceof Error ? e.message : "Failed" };
      }
    }));
  });

const conn = z.object({ clientId: z.string().uuid(), provider: z.enum(["youtube", "gbp"]), ref: z.string().min(1).max(300) });

export const addGoogleConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.extend({ accountId: z.string().uuid(), name: z.string().max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const up = await supabaseAdmin.from("pulse_connections").upsert(
      { client_id: data.clientId, provider: data.provider, account_ref: data.ref, account_name: data.name, oauth_account_id: data.accountId, status: "connected" },
      { onConflict: "client_id,provider,account_ref" },
    );
    if (up.error) throw new Error(up.error.message);
    const { syncGoogleConnection } = await import("./google.server");
    const r = await syncGoogleConnection(data.clientId, data.provider, data.ref);
    if (r !== "ok") throw new Error(`Linked, but first sync failed: ${r}`);
    return { ok: true };
  });

export const resyncGoogle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { syncGoogleConnection } = await import("./google.server");
    const r = await syncGoogleConnection(data.clientId, data.provider, data.ref);
    if (r !== "ok") throw new Error(r);
    return { ok: true };
  });

export const removeGoogleConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => conn.parse(d))
  .handler(async ({ data, context }) => {
    await mustAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("pulse_connections").delete().eq("client_id", data.clientId).eq("provider", data.provider).eq("account_ref", data.ref);
    const { count } = await supabaseAdmin.from("pulse_connections").select("account_ref", { count: "exact", head: true }).eq("client_id", data.clientId).eq("provider", data.provider);
    if (!count) {
      await supabaseAdmin.from("pulse_metrics_daily").delete().eq("client_id", data.clientId).eq("channel", data.provider);
      if (data.provider === "youtube") await supabaseAdmin.from("pulse_posts").delete().eq("client_id", data.clientId).eq("channel", "youtube");
      else await supabaseAdmin.from("pulse_reviews").delete().eq("client_id", data.clientId).eq("source", "live");
    }
    return { ok: true };
  });
