import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuthLayout, fieldClass, primaryButtonClass } from "@/components/app/AuthLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Why Media AI" },
      { name: "description", content: "Reset the password for your Why Media AI account." },
      { property: "og:title", content: "Reset your password — Why Media AI" },
      { property: "og:description", content: "Reset the password for your Why Media AI account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) setRecovery(true);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return setError(error.message);
    setNote("Check your inbox for the reset link.");
  }

  async function setNewPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError(error.message);
    navigate({ to: "/app" });
  }

  return (
    <AuthLayout
      title={recovery ? "Set a new password" : "Reset your password"}
      subtitle={
        recovery
          ? "Choose a new password and we'll take you straight in."
          : "We'll email you a link to set a new one."
      }
      footer={
        <Link to="/login" className="underline underline-offset-4">
          Back to log in
        </Link>
      }
    >
      {recovery ? (
        <form onSubmit={setNewPassword} className="space-y-3">
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            className={fieldClass}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Saving…" : "Save password"}
          </button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={fieldClass}
          />
          {error ? <p className="text-xs text-red-600">{error}</p> : null}
          {note ? <p className="text-xs text-ink-navy/60">{note}</p> : null}
          <button type="submit" disabled={busy} className={primaryButtonClass}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
