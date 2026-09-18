import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Card, CardLabel, PageHeader, pillClass } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { accounts } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Why Media AI" },
      { name: "description", content: "Set how much Marlowe can do on its own and connect your accounts." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [autonomy, setAutonomy] = useState<"guided" | "auto">("guided");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("autonomy_level")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.autonomy_level === "auto") setAutonomy("auto");
      });
  }, [user.id]);

  async function choose(level: "guided" | "auto") {
    setAutonomy(level);
    setSaving(true);
    await supabase.from("profiles").update({ autonomy_level: level }).eq("id", user.id);
    setSaving(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="How far Marlowe can go"
        subtitle="You are always in control. Marlowe asks before anything that touches money, goes public, or matters."
      />

      <Card>
        <CardLabel>Autonomy</CardLabel>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {(
            [
              {
                key: "guided" as const,
                title: "Guided",
                body: "Marlowe prepares everything and waits for your approval each morning.",
              },
              {
                key: "auto" as const,
                title: "Auto",
                body: "Marlowe ships the routine work itself and only asks about the big calls.",
              },
            ]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => choose(opt.key)}
              className={`rounded-2xl border p-5 text-left transition-all duration-300 ${
                autonomy === opt.key
                  ? "border-ink-navy bg-ink-navy text-white"
                  : "border-app-line bg-app-bg/60 text-ink-navy hover:-translate-y-0.5 hover:border-cerulean/60"
              }`}
            >
              <p className="text-sm">{opt.title}</p>
              <p
                className={`mt-2 text-xs leading-relaxed ${
                  autonomy === opt.key ? "text-white/65" : "text-ink-navy/55"
                }`}
              >
                {opt.body}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs text-ink-navy/45">
          {saving ? "Saving…" : "Saved to your profile."}
        </p>
      </Card>

      <Card>
        <CardLabel>Connect accounts</CardLabel>
        <p className="mt-3 text-sm text-ink-navy/55">
          Marlowe works inside your channels. Connecting is coming with the live release.
        </p>
        <ul className="mt-5 divide-y divide-app-line">
          {accounts.map((a) => (
            <li key={a} className="flex items-center justify-between gap-4 py-3">
              <span className="text-sm text-ink-navy">{a}</span>
              <button className={pillClass}>Connect</button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
