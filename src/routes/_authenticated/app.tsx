import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Sphere } from "@/components/app/Sphere";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your workspace — Why Media AI" },
      { name: "description", content: "Your Why Media AI workspace with Marlowe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppHome,
});

function AppHome() {
  const navigate = useNavigate();
  const { user } = Route.useRouteContext();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setName(data?.name || ""));
  }, [user.id]);

  const display = name || user.email?.split("@")[0] || "there";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="min-h-screen bg-app-bg text-ink-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
        <Sphere size={72} />
        <h1 className="display mt-8 text-4xl font-light tracking-tight">Welcome, {display}</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-navy/55">
          Your workspace is being built. Next: the sidebar and Marlowe's morning brief.
        </p>
        <button
          onClick={signOut}
          className="mt-10 rounded-full border border-app-line bg-app-card px-6 py-3 text-xs tracking-[0.16em] uppercase transition-all duration-300 hover:-translate-y-0.5 hover:border-cerulean/60"
        >
          Sign out
        </button>
      </div>
    </main>
  );
}
