import { useMemo, useState } from "react";

export type CalendarItem = {
  id: string;
  title: string;
  channel: string;
  when: string;
  status: string;
};

const channelColour: Record<string, string> = {
  Instagram: "bg-gold/25 text-ink-navy",
  Facebook: "bg-cerulean/20 text-ink-navy",
  LinkedIn: "bg-ink-navy/10 text-ink-navy",
  TikTok: "bg-brand-green/20 text-ink-navy",
  "Google Business": "bg-app-bg text-ink-navy",
};

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** A real month grid with each day's posts as chips. */
export function MonthCalendar({
  items,
  onOpen,
}: {
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));

  const days = useMemo(() => {
    const first = startOfMonth(cursor);
    const offset = (first.getDay() + 6) % 7; // Monday-first
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - offset);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      return d;
    });
  }, [cursor]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    for (const item of items) {
      const key = new Date(item.when).toDateString();
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  const today = new Date().toDateString();

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="display text-xl font-light tracking-tight">
          {cursor.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
        </p>
        <div className="flex gap-2">
          {[-1, 1].map((step) => (
            <button
              key={step}
              onClick={() =>
                setCursor((c) => new Date(c.getFullYear(), c.getMonth() + step, 1))
              }
              className="rounded-full border border-app-line bg-app-card px-4 py-1.5 text-xs text-ink-navy/65 transition-colors hover:text-ink-navy"
            >
              {step < 0 ? "←" : "→"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-7 gap-px overflow-hidden rounded-[8px] border border-app-line bg-app-line">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div
            key={d}
            className="bg-app-bg px-2 py-2 text-center text-[0.55rem] tracking-[0.18em] text-ink-navy/45 uppercase"
          >
            {d}
          </div>
        ))}
        {days.map((d) => {
          const key = d.toDateString();
          const inMonth = d.getMonth() === cursor.getMonth();
          const dayItems = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-[92px] p-2 ${inMonth ? "bg-app-card" : "bg-app-bg/60"}`}
            >
              <span
                className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.62rem] ${
                  key === today
                    ? "bg-ink-navy text-white"
                    : inMonth
                      ? "text-ink-navy/65"
                      : "text-ink-navy/25"
                }`}
              >
                {d.getDate()}
              </span>
              <div className="mt-1 space-y-1">
                {dayItems.slice(0, 3).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onOpen(item)}
                    className={`block w-full truncate rounded-md px-1.5 py-1 text-left text-[0.6rem] transition-opacity hover:opacity-80 ${
                      channelColour[item.channel] ?? "bg-app-bg text-ink-navy"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
                {dayItems.length > 3 ? (
                  <p className="px-1 text-[0.55rem] text-ink-navy/45">
                    +{dayItems.length - 3} more
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
