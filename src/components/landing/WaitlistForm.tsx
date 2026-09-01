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

const STEP_LABELS = ["Your details", "Where you are today", "How you would use it"];

function Progress({ step }: { step: number }) {
  return (
    <div className="mb-14">
      <div className="flex items-baseline justify-between">
        <p className="eyebrow text-muted-foreground">
          Step {Math.min(step, 3)} of 3 — {STEP_LABELS[Math.min(step, 3) - 1]}
        </p>
        <p className="text-xs tracking-[0.16em] text-muted-foreground uppercase tabular-nums">
          {String(Math.min(step, 3)).padStart(2, "0")} / 03
        </p>
      </div>
      <div className="mt-5 flex gap-2">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-px flex-1 transition-colors duration-500 ${
              n <= step ? "bg-ink" : "bg-rule"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export function WaitlistForm() {
  const [step, setStep] = useState(1);
  const [signupId, setSignupId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [spend, setSpend] = useState("");
  const [focus, setFocus] = useState<string[]>([]);
  const [trust, setTrust] = useState("");
  const [pilot, setPilot] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFocus = (value: string) =>
    setFocus((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  async function submitStepOne(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please add a valid email address.");
      return;
    }
    setError(null);
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from("waitlist_signups")
      .insert({
        name: name.trim(),
        email: email.trim(),
        business_name: businessName.trim() || null,
        industry: industry.trim() || null,
        focus_areas: [],
      })
      .select("id")
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError("Something went wrong. Please try again.");
      return;
    }
    setSignupId(data.id);
    setStep(2);
  }

  type SignupUpdate = {
    marketing_spend?: string | null;
    focus_areas?: string[];
    trust_requirements?: string | null;
    founding_pilot?: string | null;
  };

  async function saveAndAdvance(values: SignupUpdate, nextStep: number) {
    if (!signupId) {
      setStep(nextStep);
      return;
    }
    setError(null);
    setSaving(true);
    const { error: updateError } = await supabase
      .from("waitlist_signups")
      .update(values)
      .eq("id", signupId);
    setSaving(false);
    if (updateError) {
      setError("We could not save that. Please try again.");
      return;
    }
    setStep(nextStep);
  }

  if (step === 4) {
    return (
      <div>
        <p className="eyebrow text-muted-foreground">You are on the list</p>
        <h3 className="display mt-6 text-3xl md:text-4xl">
          Thank you, {name.split(" ")[0]}. Marlowe will be in touch.
        </h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
          Founding members onboard first. We will write to you personally at{" "}
          {email} before the cohort opens.
        </p>
      </div>
    );
  }

  return (
    <div>
      <Progress step={step} />

      {step === 1 ? (
        <form onSubmit={submitStepOne} className="space-y-12">
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
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="wl-email">
                Email
              </label>
              <input
                id="wl-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="wl-business">
                Business name <span className="normal-case">(optional)</span>
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
              <label className={labelClass} htmlFor="wl-industry">
                Industry <span className="normal-case">(optional)</span>
              </label>
              <input
                id="wl-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-6 border-t border-rule pt-10">
            <button
              type="submit"
              disabled={saving}
              className="bg-ink px-10 py-4 text-sm tracking-[0.14em] text-paper uppercase transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {saving ? "Joining" : "Join the waitlist"}
            </button>
            <span className="text-sm text-muted-foreground">
              Two short questions follow. Your place is secured at this step.
            </span>
          </div>
        </form>
      ) : null}

      {step === 2 ? (
        <div className="space-y-12">
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground">
            You are on the list. Two quick questions so Marlowe arrives already
            knowing something about you.
          </p>

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

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="flex flex-wrap items-center gap-6 border-t border-rule pt-10">
            <button
              type="button"
              disabled={saving}
              onClick={() =>
                saveAndAdvance(
                  { marketing_spend: spend || null, focus_areas: focus },
                  3,
                )
              }
              className="bg-ink px-10 py-4 text-sm tracking-[0.14em] text-paper uppercase transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {saving ? "Saving" : "Continue"}
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-12">
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
              type="button"
              disabled={saving}
              onClick={() =>
                saveAndAdvance(
                  {
                    trust_requirements: trust.trim() || null,
                    founding_pilot: pilot || null,
                  },
                  4,
                )
              }
              className="bg-ink px-10 py-4 text-sm tracking-[0.14em] text-paper uppercase transition-opacity hover:opacity-85 disabled:opacity-60"
            >
              {saving ? "Saving" : "Finish"}
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              Skip
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
