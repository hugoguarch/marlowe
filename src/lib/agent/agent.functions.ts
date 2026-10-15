/** Agent configuration: skills, tool switches and remote MCP connections, per signed-in user. */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export const getAgentConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const [s, skills, servers] = await Promise.all([
      supabase.from("agent_settings").select("disabled_tools, disabled_skills").eq("user_id", userId).maybeSingle(),
      supabase.from("agent_skills").select("id, name, summary, instructions, enabled").eq("user_id", userId).order("created_at"),
      supabase.from("agent_mcp_servers").select("id, name, url, enabled, status, last_error, tool_names").eq("user_id", userId).order("created_at"),
    ]);
    return {
      disabledTools: (s.data?.disabled_tools ?? []) as string[],
      disabledSkills: (s.data?.disabled_skills ?? []) as string[],
      skills: (skills.data ?? []) as { id: string; name: string; summary: string; instructions: string; enabled: boolean }[],
      servers: (servers.data ?? []) as { id: string; name: string; url: string; enabled: boolean; status: string; last_error: string | null; tool_names: string[] }[],
    };
  });

export const setAgentSwitch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ kind: z.enum(["tool", "skill"]), id: z.string().min(1).max(80), on: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data: s } = await supabase.from("agent_settings").select("disabled_tools, disabled_skills").eq("user_id", userId).maybeSingle();
    const col = data.kind === "tool" ? "disabled_tools" : "disabled_skills";
    const cur = new Set<string>((s?.[col] ?? []) as string[]);
    if (data.on) cur.delete(data.id); else cur.add(data.id);
    const { error } = await supabase.from("agent_settings").upsert({ user_id: userId, disabled_tools: s?.disabled_tools ?? [], disabled_skills: s?.disabled_skills ?? [], [col]: [...cur], updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const saveSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid().nullable(), name: z.string().trim().min(1).max(80), summary: z.string().max(200), instructions: z.string().trim().min(1).max(4000), enabled: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const row = { name: data.name, summary: data.summary, instructions: data.instructions, enabled: data.enabled };
    const { error } = data.id
      ? await supabase.from("agent_skills").update(row).eq("id", data.id).eq("user_id", userId)
      : await supabase.from("agent_skills").insert({ ...row, user_id: userId });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteSkill = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    await supabase.from("agent_skills").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

function parseHeaders(text: string) {
  const out: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const k = line.slice(0, i).trim(), v = line.slice(i + 1).trim();
    if (/^[A-Za-z0-9-]{1,60}$/.test(k) && v) out[k] = v.slice(0, 2000);
  }
  return out;
}

/** Connect a remote MCP server: probes it first so we only save ones that answer. */
export const addMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().trim().min(1).max(60), url: z.string().trim().url().max(500), headers: z.string().max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    if (!data.url.startsWith("https://")) throw new Error("The address must start with https://");
    const headers = parseHeaders(data.headers);
    const { probeMcp } = await import("./agent.server");
    let tools: string[] = [], status = "connected", err: string | null = null;
    try { tools = await probeMcp(data.url, headers); }
    catch (e) { status = "error"; err = (e instanceof Error ? e.message : String(e)).slice(0, 300); }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("agent_mcp_servers").insert({ user_id: userId, name: data.name, url: data.url, auth_headers: headers, status, last_error: err, tool_names: tools.slice(0, 200), enabled: status === "connected" });
    if (error) throw new Error(error.message);
    void supabase;
    if (err) throw new Error(`Saved, but it didn't answer: ${err}`);
    return { tools: tools.length };
  });

export const refreshMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as Ctx;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("agent_mcp_servers").select("url, auth_headers").eq("id", data.id).eq("user_id", userId).maybeSingle();
    if (!s) throw new Error("Not found");
    const { probeMcp } = await import("./agent.server");
    try {
      const tools = await probeMcp(s.url, (s.auth_headers ?? {}) as Record<string, string>);
      await supabaseAdmin.from("agent_mcp_servers").update({ status: "connected", last_error: null, tool_names: tools.slice(0, 200) }).eq("id", data.id).eq("user_id", userId);
      return { tools: tools.length };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 300);
      await supabaseAdmin.from("agent_mcp_servers").update({ status: "error", last_error: msg }).eq("id", data.id).eq("user_id", userId);
      throw new Error(msg);
    }
  });

export const toggleMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), on: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    await supabase.from("agent_mcp_servers").update({ enabled: data.on }).eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });

export const removeMcpServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    await supabase.from("agent_mcp_servers").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
