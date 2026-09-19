import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Card, CardLabel, PageHeader } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";

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

const channels = [
  { provider: "instagram", name: "Instagram", does: "Posts, stories and replies to comments and DMs." },
  { provider: "facebook", name: "Facebook", does: "Posts to your page and answers messages." },
  { provider: "linkedin", name: "LinkedIn", does: "Posts to your company page." },
  { provider: "tiktok", name: "TikTok", does: "Publishes short-form video." },
  { provider: "google_business", name: "Google Business", does: "Posts updates and replies to reviews." },
  { provider: "google_analytics", name: "Google Analytics", does: "Reads website traffic for your Growth numbers." },
];

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [autonomy, setAutonomy] = useState<"guided" | "auto">("guided");
  const [saving, setSaving] = useState(false);
  const [connected, setConnected] = useState<Record<string, { status: string; account_name: string | null }>>({});

  useEffect(() => {
    supabase
      .from("profiles")
      .select("autonomy_level")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.autonomy_level === "auto") setAutonomy("auto");
      });

    supabase
      .from("connected_accounts")
      .select("provider, status, account_name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        const map: Record<string, { status: string; account_name: string | null }> = {};
        (data ?? []).forEach((row) => {
          map[row.provider] = { status: row.status, account_name: row.account_name };
        });
        setConnected(map);
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
        <CardLabel>Your channels</CardLabel>
        <p className="mt-3 text-sm leading-relaxed text-ink-navy/55">
          Nothing is connected yet, so Marlowe queues posts instead of publishing them and Growth
          shows no numbers. Connecting each channel is the next piece of work.
        </p>
        <ul className="mt-5 divide-y divide-app-line">
          {channels.map((c) => {
            const state = connected[c.provider];
            const live = state?.status === "connected";
            return (
              <li key={c.provider} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="text-sm text-ink-navy">{c.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-navy/50">{c.does}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.6rem] tracking-[0.16em] uppercase ${
                    live
                      ? "border-brand-green/40 bg-brand-green/10 text-brand-green"
                      : "border-app-line bg-app-bg/60 text-ink-navy/45"
                  }`}
                >
                  {live ? (state?.account_name ?? "Connected") : "Not connected"}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
