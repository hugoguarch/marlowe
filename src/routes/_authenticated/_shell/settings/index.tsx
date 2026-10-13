import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { waitForChannelOAuth } from "@/lib/channelConnect";
import {
  completeChannelConnect,
  disconnectChannel,
  listChannels,
  startChannelConnect,
  type ChannelState,
} from "@/lib/channels.functions";

export const Route = createFileRoute("/_authenticated/_shell/settings/")({
  head: () => ({
    meta: [
      { title: "Settings — Why Media AI" },
      {
        name: "description",
        content: "Set how much Marlowe can do on its own and connect your accounts.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useRouteContext();
  const [autonomy, setAutonomy] = useState<"guided" | "auto">("guided");
  const [saving, setSaving] = useState(false);
  const [channels, setChannels] = useState<ChannelState[]>([]);
  const [working, setWorking] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useServerFn(listChannels);
  const start = useServerFn(startChannelConnect);
  const complete = useServerFn(completeChannelConnect);
  const forget = useServerFn(disconnectChannel);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("autonomy_level")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.autonomy_level === "auto") setAutonomy("auto");
      });

    load()
      .then(setChannels)
      .catch(() => {});
  }, [user.id, load]);

  async function choose(level: "guided" | "auto") {
    setAutonomy(level);
    setSaving(true);
    await supabase.from("profiles").update({ autonomy_level: level }).eq("id", user.id);
    setSaving(false);
  }

  async function connect(provider: string, name: string) {
    setError(null);
    setNote(null);
    setWorking(provider);
    const popup = window.open("", "wm-channel-oauth", "width=620,height=760");
    if (!popup) {
      setWorking(null);
      setError("Your browser blocked the login window. Allow pop-ups and try again.");
      return;
    }
    try {
      const { authorizationUrl } = await start({ data: { provider } });
      const waiting = waitForChannelOAuth(popup);
      popup.location.href = authorizationUrl;
      const { code, state } = await waiting;
      await complete({ data: { code, state } });
      setChannels(await load());
      setNote(`${name} is connected.`);
    } catch (e) {
      popup.close();
      setError(e instanceof Error ? e.message : `Couldn't connect ${name}.`);
    } finally {
      setWorking(null);
    }
  }

  async function disconnect(provider: string) {
    setWorking(provider);
    try {
      await forget({ data: { provider } });
      setChannels(await load());
    } finally {
      setWorking(null);
    }
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
        <p className="mt-4 text-xs text-ink-navy/45">{saving ? "Saving…" : "Saved to your profile."}</p>
      </Card>

      <Card>
        <CardLabel>Your channels</CardLabel>
        <p className="mt-3 text-sm leading-relaxed text-ink-navy/55">
          Sign in to each channel and Marlowe can publish and read its numbers. Until a channel is
          connected, posts stay in the queue.
        </p>

        {note ? <p className="mt-4 text-xs text-cerulean">{note}</p> : null}
        {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}

        <ul className="mt-5 divide-y divide-app-line">
          {channels.map((c) => {
            const live = c.status === "connected";
            return (
              <li key={c.provider} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div className="min-w-[14rem]">
                  <p className="text-sm text-ink-navy">{c.name}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-navy/50">
                    {!c.buildable
                      ? `${c.does} Waiting on the platform's business review.`
                      : !c.configured
                        ? `${c.does} Waiting on the developer app credentials.`
                        : c.does}
                  </p>
                </div>

                {live ? (
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-brand-green/40 bg-brand-green/10 px-4 py-1.5 text-[0.6rem] tracking-[0.16em] text-brand-green uppercase">
                      {c.accountName ?? "Connected"}
                    </span>
                    <button
                      onClick={() => disconnect(c.provider)}
                      className={pillClass}
                      disabled={working === c.provider}
                    >
                      Disconnect
                    </button>
                  </div>
                ) : c.buildable && c.configured ? (
                  <button
                    onClick={() => connect(c.provider, c.name)}
                    className={pillPrimaryClass}
                    disabled={working === c.provider}
                  >
                    {working === c.provider ? "Connecting…" : "Connect"}
                  </button>
                ) : (
                  <span className="rounded-full border border-app-line bg-app-bg/60 px-4 py-1.5 text-[0.6rem] tracking-[0.16em] text-ink-navy/45 uppercase">
                    {c.buildable ? "Setup pending" : "Coming soon"}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
