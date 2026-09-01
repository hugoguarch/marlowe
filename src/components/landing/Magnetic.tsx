import { useRef, type ReactNode } from "react";

/**
 * Wraps an interactive element so it subtly follows the cursor and
 * springs back on leave. Purely presentational — no markup changes
 * to the child element itself.
 */
export function Magnetic({
  children,
  strength = 0.25,
  max = 8,
  className = "",
}: {
  children: ReactNode;
  strength?: number;
  max?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  const clamp = (value: number) => Math.max(-max, Math.min(max, value));

  return (
    <span
      ref={ref}
      className={`magnetic ${className}`}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse") return;
        const el = ref.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const x = clamp((event.clientX - (rect.left + rect.width / 2)) * strength);
        const y = clamp((event.clientY - (rect.top + rect.height / 2)) * strength);
        el.style.setProperty("--mx", `${x}px`);
        el.style.setProperty("--my", `${y}px`);
        el.dataset["active"] = "true";
      }}
      onPointerLeave={() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty("--mx", "0px");
        el.style.setProperty("--my", "0px");
        el.dataset["active"] = "false";
      }}
    >
      {children}
    </span>
  );
}
