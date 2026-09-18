import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { Sphere } from "@/components/app/Sphere";
import { PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { chatWithMarlowe, getChatHistory } from "@/lib/marlowe.functions";
import { chatSeed } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_authenticated/app/marlowe")({
  head: () => ({
    meta: [
      { title: "Marlowe — Why Media AI" },
      { name: "description", content: "Talk to Marlowe: ask, redirect, or drop a thought." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MarlowePage,
});

type Message = { role: string; body: string };

function MarlowePage() {
  const [messages, setMessages] = useState<Message[]>(chatSeed);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const loadHistory = useServerFn(getChatHistory);
  const sendMessage = useServerFn(chatWithMarlowe);

  useEffect(() => {
    let cancelled = false;
    loadHistory()
      .then((rows) => {
        if (!cancelled && rows.length) {
          setMessages(rows.map((r) => ({ role: r.role, body: r.body })));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || busy) return;
    setDraft("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", body: text }]);
    try {
      const { reply } = await sendMessage({ data: { body: text } });
      setMessages((m) => [...m, { role: "marlowe", body: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "marlowe", body: "I couldn't reach the workspace just then. Try me again." },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col space-y-8">
      <PageHeader
        eyebrow="Always on"
        title="Marlowe"
        subtitle="A colleague, not a chatbot. Redirect it and the week reshapes itself."
      />

      <div className="flex-1 space-y-6">
        {messages.map((m, i) =>
          m.role === "marlowe" ? (
            <div key={i} className="flex items-start gap-4">
              <Sphere size={34} className="mt-1 shrink-0" />
              <div className="rounded-3xl rounded-tl-md border border-app-line bg-app-card px-5 py-4 text-sm leading-relaxed text-ink-navy/80">
                {m.body}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="max-w-lg rounded-3xl rounded-tr-md bg-ink-navy px-5 py-4 text-sm leading-relaxed text-white/90">
                {m.body}
              </div>
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-3 text-xs tracking-[0.16em] text-ink-navy/40 uppercase">
            <Sphere size={22} /> Marlowe is thinking
          </div>
        )}
      </div>

      <form
        onSubmit={send}
        className="sticky bottom-4 rounded-3xl border border-app-line bg-app-card p-3 shadow-[0_28px_70px_-64px_rgba(20,40,70,0.7)]"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask, redirect, or drop a thought"
          className="w-full bg-transparent px-3 py-2 text-sm text-ink-navy outline-none placeholder:text-ink-navy/35"
        />
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button type="button" className={pillClass}>
            Create
          </button>
          <button type="button" className={pillClass}>
            Search web
          </button>
          <button type="submit" className={`${pillPrimaryClass} ml-auto`} disabled={busy}>
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
