import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SPEND_OPTIONS = ["Agency", "In-house", "Freelancers", "Nothing yet"];
const FOCUS_OPTIONS = [
  "Social",
  "Content",
  "Ads",
  "SEO and AI search",
  "Website",
  "Email",
  "PR",
  "All of it",
];
const PILOT_OPTIONS = ["Yes", "Tell me more"];

const fieldClass =
  "w-full border-0 border-b border-rule bg-transparent px-0 py-3 text-base text-ink outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-ink";

const labelClass = "eyebrow block text-muted-foreground";

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`border px-4 py-2 text-sm transition-colors ${
        selected
          ? "border-ink bg-ink text-paper"
          : "border-rule text-ink hover:border-ink"
      }`}
    >
      {label}
    </button>
  );
}

export function WaitlistForm() {
  const [name, setName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [website, setWebsite] = useState("");
  const [industry, setIndustry] = useState("");
  const [spend, setSpend] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [trust, setTrust] = useState("");
  const [pilot, setPilot] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const toggleFocus = (value: string) =>
    setFocus((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !businessName.trim()) {
      setError("Please add your name and business name.");
      return;
    }
    setError(null);
    setStatus("saving");

    const { error: insertError } = await supabase.from("waitlist_signups").insert({
      name: name.trim(),
      business_name: businessName.trim(),
      website: website.trim() || null,
      industry: industry.trim() || null,
      marketing_spend: spend || null,
      focus_areas: focus,
      trust_requirements: trust.trim() || null,
      founding_pilot: pilot || null,
    });

    if (insertError) {
      setStatus("idle");
      setError("Something went wrong. Please try again.");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="border-t border-rule pt-14">
        <p className="eyebrow text-muted-foreground">You are on the list</p>
        <h3 className="display mt-6 text-3xl md:text-4xl">
          Thank you. Marlowe will be in touch.
        </h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Founding members onboard first. We will write to you personally before the
          cohort opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="wl-name">
            Name
          </label>
          <input
            id="wl-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldClass}
            autoComplete="name"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="wl-business">
            Business name
          </label>
          <input
            id="wl-business"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className={fieldClass}
            autoComplete="organization"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="wl-website">
            Website
          </label>
          <input
            id="wl-website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className={fieldClass}
            placeholder="https://"
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="wl-industry">
            Industry
          </label>
          <input
            id="wl-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>
          What do you spend on marketing today?
        </legend>
        <div className="mt-5 flex flex-wrap gap-3">
          {SPEND_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={spend === option}
              onClick={() => setSpend(option)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className={labelClass}>
          What would you most want Marlowe to handle?
        </legend>
        <div className="mt-5 flex flex-wrap gap-3">
          {FOCUS_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={focus.includes(option)}
              onClick={() => toggleFocus(option)}
            />
          ))}
        </div>
      </fieldset>

      <div>
        <label className={labelClass} htmlFor="wl-trust">
          What would Marlowe need to do before you trusted it to run on its own?
        </label>
        <textarea
          id="wl-trust"
          rows={3}
          value={trust}
          onChange={(e) => setTrust(e.target.value)}
          className={`${fieldClass} resize-none`}
        />
      </div>

      <fieldset>
        <legend className={labelClass}>
          Would you like a founding-member pilot?
        </legend>
        <div className="mt-5 flex flex-wrap gap-3">
          {PILOT_OPTIONS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={pilot === option}
              onClick={() => setPilot(option)}
            />
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-6 border-t border-rule pt-10">
        <button
          type="submit"
          disabled={status === "saving"}
          className="bg-ink px-10 py-4 text-sm tracking-[0.14em] text-paper uppercase transition-opacity hover:opacity-85 disabled:opacity-60"
        >
          {status === "saving" ? "Sending" : "Join the waitlist"}
        </button>
        <span className="text-sm text-muted-foreground">
          Founding members onboard first.
        </span>
      </div>
    </form>
  );
}
