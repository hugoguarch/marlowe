import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AppSidebar } from "@/components/app/AppSidebar";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Your workspace — Why Media AI" },
      { name: "description", content: "Your Why Media AI workspace with Marlowe." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const { user } = Route.useRouteContext();
  const [profile, setProfile] = useState<{ name: string; autonomy: string }>({
    name: "",
    autonomy: "Guided",
  });

  useEffect(() => {
    supabase
      .from("profiles")
      .select("name, autonomy_level")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setProfile({
          name: data.name || "",
          autonomy: data.autonomy_level === "auto" ? "Auto" : "Guided",
        });
      });
  }, [user.id]);

  const displayName = profile.name || user.email?.split("@")[0] || "You";

  return (
    <div className="min-h-screen bg-app-bg text-ink-navy">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AppSidebar
          name={displayName}
          email={user.email ?? ""}
          autonomy={profile.autonomy}
        />
        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
