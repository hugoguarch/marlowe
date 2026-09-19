/**
 * Channel connections — server-only OAuth plumbing.
 *
 * Tokens are encrypted with CHANNEL_TOKEN_SECRET before they ever touch the
 * database, and never leave the server.
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export type ProviderId =
  | "google_analytics"
  | "linkedin"
  | "tiktok"
  | "instagram"
  | "facebook"
  | "google_business";

export type ProviderConfig = {
  id: ProviderId;
  name: string;
  does: string;
  /** false = platform review not obtainable yet; shown as coming soon. */
  buildable: boolean;
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  /** Some providers want the client key under a different parameter name. */
  clientIdParam?: string;
  clientSecretParam?: string;
  extraAuthParams?: Record<string, string>;
};

export const providers: ProviderConfig[] = [
  {
    id: "google_analytics",
    name: "Google Analytics",
    does: "Reads website traffic and audience numbers into Growth.",
    buildable: true,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/analytics.readonly", "openid", "email"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
    extraAuthParams: { access_type: "offline", prompt: "consent", include_granted_scopes: "true" },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    does: "Posts to your company page and reads page performance.",
    buildable: true,
    authorizeUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["openid", "profile", "email", "w_member_social"],
    clientIdEnv: "LINKEDIN_CLIENT_ID",
    clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
  },
  {
    id: "tiktok",
    name: "TikTok",
    does: "Publishes short-form video and reads its performance.",
    buildable: true,
    authorizeUrl: "https://www.tiktok.com/v2/auth/authorize/",
    tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
    scopes: ["user.info.basic", "video.publish", "video.list"],
    clientIdEnv: "TIKTOK_CLIENT_KEY",
    clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    clientIdParam: "client_key",
    clientSecretParam: "client_secret",
  },
  {
    id: "instagram",
    name: "Instagram",
    does: "Posts, stories and replies to comments and DMs.",
    buildable: false,
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["instagram_basic", "instagram_content_publish", "pages_show_list"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  {
    id: "facebook",
    name: "Facebook",
    does: "Posts to your page and answers messages.",
    buildable: false,
    authorizeUrl: "https://www.facebook.com/v21.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
    scopes: ["pages_manage_posts", "pages_read_engagement", "pages_show_list"],
    clientIdEnv: "META_APP_ID",
    clientSecretEnv: "META_APP_SECRET",
  },
  {
    id: "google_business",
    name: "Google Business",
    does: "Posts updates and replies to reviews.",
    buildable: false,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/business.manage"],
    clientIdEnv: "GOOGLE_OAUTH_CLIENT_ID",
    clientSecretEnv: "GOOGLE_OAUTH_CLIENT_SECRET",
  },
];

export function providerById(id: string): ProviderConfig | undefined {
  return providers.find((p) => p.id === id);
}

export function providerCredentials(p: ProviderConfig) {
  const clientId = process.env[p.clientIdEnv];
  const clientSecret = process.env[p.clientSecretEnv];
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

function key(): Buffer {
  const raw = process.env["CHANNEL_TOKEN_SECRET"];
  if (!raw) throw new Error("CHANNEL_TOKEN_SECRET is not set");
  return createHmac("sha256", "channel-token").update(raw).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ct]).toString("base64");
}

export function decryptToken(stored: string): string {
  const buf = Buffer.from(stored, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

/** state = base64(payload).hmac — proves the callback belongs to this user. */
export function signState(payload: { userId: string; provider: string; nonce: string }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const mac = createHmac("sha256", key()).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifyState(state: string): { userId: string; provider: string } | null {
  const [body, mac] = state.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", key()).update(body).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export type TokenResponse = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  scopes: string | null;
  accountName: string | null;
  externalAccountId: string | null;
};

export async function exchangeCode(
  p: ProviderConfig,
  code: string,
  redirectUri: string,
): Promise<TokenResponse> {
  const creds = providerCredentials(p);
  if (!creds) throw new Error(`${p.name} is not configured yet.`);

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    [p.clientIdParam ?? "client_id"]: creds.clientId,
    [p.clientSecretParam ?? "client_secret"]: creds.clientSecret,
  });

  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${p.name} refused the connection [${res.status}]: ${text.slice(0, 300)}`);

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`${p.name} returned an unreadable response.`);
  }

  const payload = json.data ?? json;
  const accessToken: string | undefined = payload.access_token;
  if (!accessToken) throw new Error(`${p.name} did not return an access token.`);

  const expiresIn = Number(payload.expires_in ?? 0);
  return {
    accessToken,
    refreshToken: payload.refresh_token ?? null,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    scopes: payload.scope ?? null,
    accountName: payload.open_id ? null : null,
    externalAccountId: payload.open_id ?? payload.user_id ?? null,
  };
}

export async function refreshAccessToken(
  p: ProviderConfig,
  refreshToken: string,
): Promise<TokenResponse | null> {
  const creds = providerCredentials(p);
  if (!creds) return null;
  const res = await fetch(p.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      [p.clientIdParam ?? "client_id"]: creds.clientId,
      [p.clientSecretParam ?? "client_secret"]: creds.clientSecret,
    }),
  });
  if (!res.ok) return null;
  const payload = (await res.json().catch(() => null)) as any;
  const data = payload?.data ?? payload;
  if (!data?.access_token) return null;
  const expiresIn = Number(data.expires_in ?? 0);
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    scopes: data.scope ?? null,
    accountName: null,
    externalAccountId: null,
  };
}
