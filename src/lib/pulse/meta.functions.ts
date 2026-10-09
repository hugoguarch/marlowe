/** Meta read endpoints. The browser only calls these; all Graph calls and the token stay server-side. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const CACHE_MS = 3600_000;
type Ctx = { supabase: any; userId: string };

async function isAdmin(ctx: Ctx) {
  const { data } = await ctx.supabase.rpc("pulse_is_admin", { _uid: ctx.userId });
  return !!data;
}

/** Runs fn, turning Meta errors into user-safe messages. Token errors are only detailed for admins. */
async function safe<T>(ctx: Ctx, fn: () => Promise<T>): Promise<{ ok: true; data: T } | { ok: false; kind: string; message: string }> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    const { MetaError } = await import("./meta.server");
    if (e instanceof MetaError) {
      if (e.kind === "token") {
        return { ok: false, kind: "token", message: (await isAdmin(ctx)) ? "The Meta token is invalid or expired. Update META_ACCESS_TOKEN in the backend secrets." : "Meta data is temporarily unavailable. Please contact an admin." };
      }
      return { ok: false, kind: e.kind, message: e.message };
    }
    console.error("Meta call failed", e instanceof Error ? e.message : "unknown");
    return { ok: false, kind: "other", message: "Meta request failed" };
  }
}

async function cached<T>(clientId: string, key: string, refresh: boolean, fn: () => Promise<T>) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  if (!refresh) {
    const { data } = await supabaseAdmin.from("meta_cache").select("payload, fetched_at").eq("client_id", clientId).eq("cache_key", key).maybeSingle();
    if (data && Date.now() - new Date(data.fetched_at).getTime() < CACHE_MS) return { ...(data.payload as T), fetchedAt: data.fetched_at as string };
  }
  const payload = await fn();
  const fetchedAt = new Date().toISOString();
  await supabaseAdmin.from("meta_cache").upsert({ client_id: clientId, cache_key: key, payload: payload as any, fetched_at: fetchedAt });
  return { ...payload, fetchedAt };
}

export const metaDiscover = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    if (!(await isAdmin(context))) throw new Error("Only Pulse admins can manage data sources");
    return safe(context, async () => (await import("./meta.server")).discover());
  });

export const getMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase.from("client_meta_connections").select("*").eq("client_id", data.clientId).maybeSingle();
    return row as null | { fb_page_id: string | null; fb_page_name: string | null; ig_user_id: string | null; ig_username: string | null; ad_account_ids: string[]; updated_at: string };
  });

export const saveMetaConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      clientId: z.string().uuid(),
      fbPageId: z.string().max(64).nullable(), fbPageName: z.string().max(300).nullable(),
      igUserId: z.string().max(64).nullable(), igUsername: z.string().max(300).nullable(),
      adAccountIds: z.array(z.string().regex(/^act_\d+$/)).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Only Pulse admins can manage data sources");
    const empty = !data.fbPageId && !data.igUserId && !data.adAccountIds.length;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("meta_cache").delete().eq("client_id", data.clientId);
    if (empty) {
      const del = await context.supabase.from("client_meta_connections").delete().eq("client_id", data.clientId);
      if (del.error) throw new Error(del.error.message);
      const { syncMetaClient } = await import("./meta-sync.server");
      await syncMetaClient(data.clientId);
      return { ok: true };
    }
    const up = await context.supabase.from("client_meta_connections").upsert({
      client_id: data.clientId, fb_page_id: data.fbPageId, fb_page_name: data.fbPageName,
      ig_user_id: data.igUserId, ig_username: data.igUsername, ad_account_ids: data.adAccountIds, updated_at: new Date().toISOString(),
    });
    if (up.error) throw new Error(up.error.message);
    const { syncMetaClient } = await import("./meta-sync.server");
    return { ok: true, sync: await syncMetaClient(data.clientId) };
  });

export const syncMetaNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ clientId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isAdmin(context))) throw new Error("Only Pulse admins can manage data sources");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("meta_cache").delete().eq("client_id", data.clientId);
    const { syncMetaClient } = await import("./meta-sync.server");
    return syncMetaClient(data.clientId);
  });

const rangeIn = z.object({
  clientId: z.string().uuid(),
  tab: z.enum(["facebook", "instagram", "ads"]),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  refresh: z.boolean().default(false),
});

export const getMetaTab = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => rangeIn.parse(d))
  .handler(async ({ data, context }) => {
    // RLS read proves the caller may see this client.
    const { data: conn } = await context.supabase.from("client_meta_connections").select("*").eq("client_id", data.clientId).maybeSingle();
    if (!conn) return { connected: false as const };
    const m = await import("./meta.server");
    const key = `${data.tab}:${data.from}:${data.to}`;
    if (data.tab === "facebook") {
      if (!conn.fb_page_id) return { connected: false as const };
      return { connected: true as const, tab: "facebook" as const, result: await safe(context, () => cached(data.clientId, key, data.refresh, () => m.facebook(conn.fb_page_id!, data.from, data.to))) };
    }
    if (data.tab === "instagram") {
      if (!conn.ig_user_id) return { connected: false as const };
      return { connected: true as const, tab: "instagram" as const, result: await safe(context, () => cached(data.clientId, key, data.refresh, () => m.instagram(conn.ig_user_id!, data.from, data.to))) };
    }
    if (!conn.ad_account_ids?.length) return { connected: false as const };
    return { connected: true as const, tab: "ads" as const, result: await safe(context, () => cached(data.clientId, key, data.refresh, () => m.ads(conn.ad_account_ids, data.from, data.to))) };
  });
