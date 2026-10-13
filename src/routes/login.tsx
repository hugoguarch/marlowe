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

function safeNext(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>) => {
    const next = safeNext(s["next"]);
    return next ? { next } : {};
  },
  head: () => ({
    meta: [
      { title: "Log in — Why Media AI" },
      { name: "description", content: "Sign in to Why Media AI and pick up Marlowe's morning brief." },
      { property: "og:title", content: "Log in — Why Media AI" },
      { property: "og:description", content: "Sign in to Why Media AI and pick up Marlowe's morning brief." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch() as { next?: string };
  const next = safeNext(search.next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function done() {
    if (next) {
      window.location.href = next;
      return;
    }
    navigate({ to: "/dashboard" });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    done();
  }

  async function onGoogle() {
    setError(null);
    setBusy(true);
    try {
      if (next) sessionStorage.setItem("wm.authNext", next);
      else sessionStorage.removeItem("wm.authNext");
    } catch {
      /* storage unavailable */
    }
    const result = await signInWithGoogle();
    if (result.redirected) return;
    setBusy(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    done();
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Marlowe has been working. Sign in to see what it did."
      footer={
        <span>
          New here?{" "}
          <Link to="/signup" className="text-ink-navy underline underline-offset-4">
            Create an account
          </Link>
        </span>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
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
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className={fieldClass}
        />
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <button type="submit" disabled={busy} className={primaryButtonClass}>
          {busy ? "Signing in…" : "Log in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4 text-[0.65rem] tracking-[0.2em] text-ink-navy/35 uppercase">
        <span className="h-px flex-1 bg-app-line" /> or <span className="h-px flex-1 bg-app-line" />
      </div>

      <button type="button" onClick={onGoogle} disabled={busy} className={ghostButtonClass}>
        <GoogleMark /> Continue with Google
      </button>

      <p className="mt-6 text-center text-xs text-ink-navy/45">
        <Link to="/reset-password" className="underline underline-offset-4">
          Forgot your password?
        </Link>
      </p>
    </AuthLayout>
  );
}
