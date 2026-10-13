import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import fBold from "@/assets/report/hn-Bold.otf.asset.json";
import fLight from "@/assets/report/hn-Light.otf.asset.json";
import fMedium from "@/assets/report/hn-Medium.otf.asset.json";
import fRoman from "@/assets/report/hn-Roman.otf.asset.json";
import { PulseProvider } from "@/components/pulse/context";
import { AgentBar } from "@/components/shell/AgentBar";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/_shell")({
  head: () => ({
    meta: [
      { title: "Why Media AI" },
      { name: "description", content: "Why Media AI: marketing, design, video and web agents in one workspace." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ShellLayout,
});

const FONTS = `
@font-face{font-family:"Helvetica Neue";font-weight:300;src:url(${fLight.url}) format("opentype");font-display:swap}
@font-face{font-family:"Helvetica Neue";font-weight:400;src:url(${fRoman.url}) format("opentype");font-display:swap}
@font-face{font-family:"Helvetica Neue";font-weight:500;src:url(${fMedium.url}) format("opentype");font-display:swap}
@font-face{font-family:"Helvetica Neue";font-weight:700;src:url(${fBold.url}) format("opentype");font-display:swap}`;

function ShellLayout() {
  const { user } = Route.useRouteContext();
  return (
    <PulseProvider userId={user.id}>
      <style>{FONTS}</style>
      <Frame userId={user.id} email={user.email ?? ""} />
      <Toaster />
    </PulseProvider>
  );
}

function Frame({ userId, email }: { userId: string; email: string }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [agentOpen, setAgentOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState("Guided autonomy");

  useEffect(() => {
    supabase
      .from("profiles")
      .select("name, autonomy_level")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name) setName(data.name);
        if (data) setRole(data.autonomy_level === "auto" ? "Auto autonomy" : "Guided autonomy");
      });
  }, [userId]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  const onAgent = path.startsWith("/agent");

  return (
    <div className="wm-shell flex min-h-screen bg-app-bg font-sans text-ink-navy">
      <Sidebar name={name || email.split("@")[0] || "You"} role={role} onSignOut={signOut} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onNewTask={() => setAgentOpen(true)} />
        <main key={path.split("/").slice(0, 3).join("/")} className={`wm-fade flex-1 ${onAgent ? "" : "px-6 pt-7 pb-28 lg:px-8"}`}>
          <Outlet />
        </main>
      </div>
      {onAgent ? null : <AgentBar open={agentOpen} setOpen={setAgentOpen} />}
    </div>
  );
}
