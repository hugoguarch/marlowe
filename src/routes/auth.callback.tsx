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

    async function go() {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      navigate({ to: data.session ? "/app" : "/login", replace: true });
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/app", replace: true });
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
