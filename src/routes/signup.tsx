import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  AuthLayout,
  GoogleMark,
  fieldClass,
  ghostButtonClass,
  primaryButtonClass,
} from "@/components/app/AuthLayout";
import { supabase } from "@/integrations/supabase/client";
import { signInWithGoogle } from "@/lib/auth";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create your account — Why Media AI" },
      { name: "description", content: "Create a Why Media AI account and start working with Marlowe." },
      { property: "og:title", content: "Create your account — Why Media AI" },
      { property: "og:description", content: "Create a Why Media AI account and start working with Marlowe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { name },
      },
    });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (data.session) {
      navigate({ to: "/app" });
      return;
    }
    setSent(true);
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    if (result.redirected) return;
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    navigate({ to: "/app" });
  }

  return (
    <AuthLayout
      title={sent ? "Check your email" : "Create your account"}
      subtitle={
        sent
          ? `We sent a confirmation link to ${email}. Click it and Marlowe will be waiting.`
          : "A few details and Marlowe starts learning your brand."
      }
      footer={
        <span>
          Already with us?{" "}
          <Link to="/login" className="text-ink-navy underline underline-offset-4">
            Log in
          </Link>
        </span>
      }
    >
      {sent ? null : (
        <>
          <form onSubmit={onSubmit} className="space-y-3">
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={fieldClass}
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className={fieldClass}
            />
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (8+ characters)"
              className={fieldClass}
            />
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={busy} className={primaryButtonClass}>
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4 text-[0.65rem] tracking-[0.2em] text-ink-navy/35 uppercase">
            <span className="h-px flex-1 bg-app-line" /> or{" "}
            <span className="h-px flex-1 bg-app-line" />
          </div>

          <button type="button" onClick={onGoogle} disabled={busy} className={ghostButtonClass}>
            <GoogleMark /> Continue with Google
          </button>
        </>
      )}
    </AuthLayout>
  );
}
