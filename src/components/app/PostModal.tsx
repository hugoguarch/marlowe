import { useEffect, useState } from "react";

import { PostDesign, type DesignTokens } from "./PostDesign";
import { pillClass, pillPrimaryClass } from "./ui";

export type PostView = {
  id: string;
  title: string;
  caption?: string | null;
  channel: string;
  status: string;
  when?: string | null;
  imageUrl?: string | null;
  template?: string | null;
  /** Present for scheduled items, which can be moved or removed. */
  scheduleId?: string | null;
};

export function PostModal({
  post,
  tokens,
  onClose,
  onReschedule,
  onRemove,
}: {
  post: PostView;
  tokens: DesignTokens;
  onClose: () => void;
  onReschedule?: (scheduleId: string, when: string) => Promise<void>;
  onRemove?: (scheduleId: string) => Promise<void>;
}) {
  const [when, setWhen] = useState(() =>
    post.when ? new Date(post.when).toISOString().slice(0, 16) : "",
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-navy/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="grid max-h-[90vh] w-full max-w-3xl gap-6 overflow-y-auto rounded-[8px] border border-app-line bg-app-card p-6 sm:grid-cols-[minmax(0,260px)_1fr] sm:p-7"
      >
        <PostDesign
          template={post.template ?? "carousel"}
          tokens={tokens}
          imageUrl={post.imageUrl ?? null}
          content={post.caption ? { headline: post.title, subhead: post.caption } : { headline: post.title }}
        />

        <div>
          <p className="text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
            {post.channel} · {post.status}
          </p>
          <h2 className="display mt-2 text-2xl font-light tracking-tight">{post.title}</h2>
          {post.when ? (
            <p className="mt-2 text-xs text-ink-navy/50">
              {new Date(post.when).toLocaleString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : null}
          {post.caption ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-navy/70">{post.caption}</p>
          ) : null}

          {post.scheduleId && onReschedule ? (
            <div className="mt-6">
              <label className="text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
                Move to
              </label>
              <input
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                className="mt-2 w-full rounded-[8px] border border-app-line bg-app-bg/60 px-3 py-2 text-sm text-ink-navy outline-none focus:border-cerulean"
              />
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap gap-2">
            {post.scheduleId && onReschedule ? (
              <button
                className={pillPrimaryClass}
                disabled={busy || !when}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onReschedule(post.scheduleId!, new Date(when).toISOString());
                    onClose();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Reschedule
              </button>
            ) : null}
            {post.scheduleId && onRemove ? (
              <button
                className={pillClass}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await onRemove(post.scheduleId!);
                    onClose();
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Remove
              </button>
            ) : null}
            <button className={pillClass} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
