/**
 * Channel connections — the server functions the Settings page calls.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export type ChannelState = {
  provider: string;
  name: string;
  does: string;
  buildable: boolean;
  configured: boolean;
  status: "connected" | "disconnected";
  accountName: string | null;
  connectedAt: string | null;
};

function originFrom(): string {
  const request = getRequest();
  if (!request) throw new Error("Connecting must start from the app.");
  const url = new URL(request.url);
  const forwarded = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
  return forwarded ? `https://${forwarded}` : url.origin;
}

/** Every channel, with its true state for this person. */
export const listChannels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { providers, providerCredentials } = await import("@/lib/channels.server");

    const { data: rows } = await supabase
      .from("connected_accounts")
      .select("provider, status, account_name, connected_at")
      .eq("user_id", userId);

    const byProvider = new Map<string, any>((rows ?? []).map((r: any) => [r.provider, r]));

    return providers.map((p) => {
      const row = byProvider.get(p.id);
      return {
        provider: p.id,
        name: p.name,
        does: p.does,
        buildable: p.buildable,
        configured: Boolean(providerCredentials(p)),
        status: row?.status === "connected" ? "connected" : "disconnected",
        accountName: row?.account_name ?? null,
        connectedAt: row?.connected_at ?? null,
      };
    }) as ChannelState[];
  });

/** Build the provider's own login URL for this person. */
export const startChannelConnect = createServerFn({ method: "POST" })
  .inputValidator((input: { provider: string }) => ({ provider: String(input.provider) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { userId } = context as unknown as Ctx;
    const { providerById, providerCredentials, signState } = await import("@/lib/channels.server");

    const p = providerById(data.provider);
    if (!p) throw new Error("Unknown channel.");
    if (!p.buildable) {
      throw new Error(`${p.name} needs Meta's business review before it can be connected.`);
    }
    const creds = providerCredentials(p);
    if (!creds) {
      throw new Error(
        `${p.name} is not set up yet — the developer app credentials still need adding.`,
      );
    }

    const redirectUri = `${originFrom()}/oauth/callback`;
    const state = signState({ userId, provider: p.id, nonce: crypto.randomUUID() });
    const params = new URLSearchParams({
      response_type: "code",
      redirect_uri: redirectUri,
      state,
      scope: p.scopes.join(p.id === "tiktok" ? "," : " "),
      [p.clientIdParam ?? "client_id"]: creds.clientId,
      ...(p.extraAuthParams ?? {}),
    });

    return { authorizationUrl: `${p.authorizeUrl}?${params.toString()}` };
  });

/** Swap the provider's code for tokens and store them encrypted. */
export const completeChannelConnect = createServerFn({ method: "POST" })
  .inputValidator((input: { code: string; state: string }) => ({
    code: String(input.code),
    state: String(input.state),
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { providerById, verifyState, exchangeCode, encryptToken } = await import(
      "@/lib/channels.server"
    );

    const parsed = verifyState(data.state);
    if (!parsed || parsed.userId !== userId) throw new Error("That connection could not be verified.");
    const p = providerById(parsed.provider);
    if (!p) throw new Error("Unknown channel.");

    const tokens = await exchangeCode(p, data.code, `${originFrom()}/oauth/callback`);

    const { data: existing } = await supabase
      .from("connected_accounts")
      .select("id")
      .eq("user_id", userId)
      .eq("provider", p.id)
      .maybeSingle();

    const row = {
      user_id: userId,
      provider: p.id,
      status: "connected",
      account_name: tokens.accountName ?? p.name,
      connected_at: new Date().toISOString(),
      external_account_id: tokens.externalAccountId,
      access_token_ciphertext: encryptToken(tokens.accessToken),
      refresh_token_ciphertext: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      scopes: tokens.scopes,
      expires_at: tokens.expiresAt,
    };

    if (existing?.id) {
      const { error } = await supabase.from("connected_accounts").update(row).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("connected_accounts").insert(row);
      if (error) throw error;
    }

    return { ok: true, provider: p.id, name: p.name };
  });

/** Forget a channel's access. */
export const disconnectChannel = createServerFn({ method: "POST" })
  .inputValidator((input: { provider: string }) => ({ provider: String(input.provider) }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { error } = await supabase
      .from("connected_accounts")
      .update({
        status: "disconnected",
        access_token_ciphertext: null,
        refresh_token_ciphertext: null,
        expires_at: null,
        connected_at: null,
      })
      .eq("user_id", userId)
      .eq("provider", data.provider);
    if (error) throw error;
    return { ok: true };
  });
