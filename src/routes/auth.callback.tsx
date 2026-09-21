import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Sphere } from "@/components/app/Sphere";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Signing you in — Why Media AI" },
      { name: "description", content: "Completing your Why Media AI sign-in." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CallbackPage,
});

function CallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    function pendingNext() {
      try {
        const value = sessionStorage.getItem("wm.authNext");
        if (value && value.startsWith("/") && !value.startsWith("//")) return value;
      } catch {
        /* storage unavailable */
      }
      return null;
    }

    function land() {
      const next = pendingNext();
      if (next) {
        try {
          sessionStorage.removeItem("wm.authNext");
        } catch {
          /* ignore */
        }
        window.location.replace(next);
        return;
      }
      navigate({ to: "/app", replace: true });
    }

    async function go() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) land();
      else navigate({ to: "/login", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) land();
    });

    const timer = setTimeout(go, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-app-bg text-ink-navy">
      <Sphere size={56} className="animate-pulse" />
      <p className="text-xs tracking-[0.2em] text-ink-navy/50 uppercase">Signing you in…</p>
    </main>
  );
}
