import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/callback")({
  head: () => ({
    meta: [
      { title: "Connecting… — Why Media AI" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OAuthCallback,
});

/**
 * The window the provider sends people back to. It only hands the one-time
 * code to the app window that opened it — no credentials live here.
 */
function OAuthCallback() {
  const [message, setMessage] = useState("Finishing the connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const error = params.get("error_description") ?? params.get("error");

    const send = (payload: Record<string, unknown>) => {
      window.opener?.postMessage({ type: "channelOAuth", ...payload }, window.location.origin);
      window.close();
    };

    if (error || !code || !state) {
      setMessage(error ?? "That connection did not complete.");
      send({ ok: false, error: error ?? "No authorisation code was returned." });
      return;
    }
    send({ ok: true, code, state });
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-app-bg px-6">
      <p className="text-sm text-ink-navy/60">{message}</p>
    </main>
  );
}
