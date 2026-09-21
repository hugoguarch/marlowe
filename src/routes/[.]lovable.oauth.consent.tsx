import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";

import { AuthLayout, ghostButtonClass, primaryButtonClass } from "@/components/app/AuthLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Missing authorization_id");
    const { data } = await supabase.auth.getSession();
    const next = location.pathname + location.searchStr;
    if (!data.session) throw redirect({ to: "/login", search: { next } });
  },
  loader: async ({ location }) => {
    const authorizationId = new URLSearchParams(location.search).get("authorization_id")!;
    const oauth = (supabase.auth as unknown as {
      oauth: {
        getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
      };
    }).oauth;
    const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
    if (error) throw error;
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <AuthLayout title="Something went wrong" subtitle="We could not load this authorisation request.">
      <p className="text-xs text-red-600">{String((error as Error)?.message ?? error)}</p>
    </AuthLayout>
  ),
});

function Consent() {
  const details = Route.useLoaderData() as any;
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientName = details?.client?.name ?? "this app";

  async function decide(approve: boolean) {
    setBusy(true);
    setError(null);
    const oauth = (supabase.auth as unknown as {
      oauth: {
        approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
        denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
      };
    }).oauth;
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorization_id)
      : await oauth.denyAuthorization(authorization_id);
    if (error) {
      setBusy(false);
      setError(error.message);
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorisation server.");
      return;
    }
    window.location.href = target;
  }

  return (
    <AuthLayout
      title={`Connect ${clientName}`}
      subtitle={`This lets ${clientName} use Marlowe as you — your brands, posts and schedule.`}
    >
      {error ? (
        <p role="alert" className="mb-3 text-xs text-red-600">
          {error}
        </p>
      ) : null}
      <div className="space-y-3">
        <button type="button" disabled={busy} onClick={() => decide(true)} className={primaryButtonClass}>
          {busy ? "Working…" : "Approve"}
        </button>
        <button type="button" disabled={busy} onClick={() => decide(false)} className={ghostButtonClass}>
          Deny
        </button>
      </div>
    </AuthLayout>
  );
}
