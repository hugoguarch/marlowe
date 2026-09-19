import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";

import { Sphere } from "@/components/app/Sphere";
import { Card, CardLabel, PageHeader, pillClass, pillPrimaryClass } from "@/components/app/ui";
import { supabase } from "@/integrations/supabase/client";
import { useSelectedBrandId } from "@/lib/brandSelection";
import {
  analyseGuidelines,
  createBrand,
  deleteBrand,
  deleteBrandAsset,
  getBrandBrain,
  listBrands,
  registerBrandAsset,
  saveBrandBrain,
  setDailyTarget,
  setDefaultBrand,
  setPrimaryAsset,
  type BrandAsset,
  type BrandBrain,
  type PaletteColour,
  type Persona,
} from "@/lib/brand.functions";

const MAX_UPLOAD_MB = 50;

export const Route = createFileRoute("/_authenticated/app/brand")({
  head: () => ({
    meta: [
      { title: "Brand Brain — Why Media AI" },
      { name: "description", content: "Everything Marlowe knows about your brand." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BrandPage,
});

const inputClass =
  "w-full rounded-xl border border-app-line bg-app-bg/60 px-3 py-2 text-sm text-ink-navy outline-none focus:border-cerulean";

function BrandPage() {
  const { user } = Route.useRouteContext();
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [brain, setBrain] = useState<BrandBrain | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const all = useServerFn(listBrands);
  const one = useServerFn(getBrandBrain);
  const make = useServerFn(createBrand);
  const save = useServerFn(saveBrandBrain);
  const register = useServerFn(registerBrandAsset);
  const analyse = useServerFn(analyseGuidelines);

  useEffect(() => {
    Promise.all([all(), one({ data: {} })])
      .then(([list, current]) => {
        setBrands(list);
        setBrain(current);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [all, one]);

  async function select(brandId: string) {
    setLoading(true);
    setBrain(await one({ data: { brandId } }));
    setLoading(false);
  }

  async function persist(patch: Parameters<typeof save>[0]["data"]) {
    setStatus("Saving…");
    try {
      const updated = await save({ data: patch });
      setBrain(updated);
      setStatus("Saved");
      setTimeout(() => setStatus(null), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
      setStatus(null);
    }
  }

  async function upload(file: File, kind: string, brandId: string) {
    const safe = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${user.id}/${brandId}/${kind}/${crypto.randomUUID()}-${safe}`;
    const { error: uploadError } = await supabase.storage
      .from("brand-assets")
      .upload(path, file, file.type ? { contentType: file.type } : {});

    if (uploadError) throw uploadError;
    await register({
      data: { brandId, kind, filePath: path, fileName: file.name, mimeType: file.type },
    });
    return path;
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl">
        <Card>
          <p className="text-sm text-ink-navy/45">Opening the brand brain…</p>
        </Card>
      </div>
    );
  }

  if (creating || !brain) {
    return (
      <CreateBrandFlow
        {...(brain ? { onCancel: () => setCreating(false) } : {})}
        onCreate={async (name, website) => make({ data: { name, website } })}
        onUpload={upload}
        onAnalyse={(brandId, filePath, brandName) =>
          analyse({ data: { brandId, filePath, brandName } })
        }
        onSave={async (patch) => {
          const updated = await save({ data: patch });
          setBrain(updated);
          setBrands(await all());
          setCreating(false);
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        eyebrow="The brand brain"
        title={brain.name}
        subtitle="Everything Marlowe uses to write, design and post. Edit anything and it applies from the next post."
        action={
          <div className="flex flex-wrap items-center gap-2">
            {brands.length > 1 ? (
              <select
                value={brain.brandId}
                onChange={(e) => select(e.target.value)}
                className="rounded-full border border-app-line bg-app-card px-4 py-2 text-xs tracking-[0.12em] text-ink-navy uppercase"
              >
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            ) : null}
            <button onClick={() => setCreating(true)} className={pillClass}>
              New brand brain
            </button>
          </div>
        }
      />

      {status ? <p className="text-xs tracking-[0.18em] text-cerulean uppercase">{status}</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardLabel>Logo</CardLabel>
          <div className="mt-5 flex items-center gap-5 rounded-2xl border border-app-line bg-app-bg/60 p-6">
            {brain.logoUrl ? (
              <img src={brain.logoUrl} alt="Brand logo" className="h-14 w-auto object-contain" />
            ) : (
              <Sphere size={56} />
            )}
            <div>
              <p className="text-sm text-ink-navy">{brain.name}</p>
              <p className="mt-1 text-xs text-ink-navy/45">
                {brain.logoUrl ? "Primary mark" : "No logo uploaded yet"}
              </p>
            </div>
          </div>
          <FilePick
            label={brain.logoUrl ? "Replace logo" : "Upload logo"}
            accept="image/*"
            onPick={async (file) => {
              await upload(file, "logo", brain.brandId);
              setBrain(await one({ data: { brandId: brain.brandId } }));
            }}
          />
        </Card>

        <Card>
          <CardLabel>Colour palette</CardLabel>
          <PaletteEditor
            value={brain.palette}
            onSave={(palette) => persist({ brandId: brain.brandId, palette })}
          />
        </Card>

        <Card>
          <CardLabel>Typography</CardLabel>
          <TypographyEditor
            value={brain.typography}
            fonts={brain.assets.filter((a) => a.kind === "font")}
            onSave={(typography) => persist({ brandId: brain.brandId, typography })}
            onUploadFont={async (file) => {
              await upload(file, "font", brain.brandId);
              setBrain(await one({ data: { brandId: brain.brandId } }));
            }}
          />
        </Card>

        <Card>
          <CardLabel>Tone of voice</CardLabel>
          <LineEditor
            value={brain.toneOfVoice}
            placeholder="Confident, never loud."
            onSave={(toneOfVoice) => persist({ brandId: brain.brandId, toneOfVoice })}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardLabel>Audience and personas</CardLabel>
          <AudienceEditor
            audience={brain.audience}
            personas={brain.personas}
            onSave={(audience, personas) => persist({ brandId: brain.brandId, audience, personas })}
          />
        </Card>

        <Card className="lg:col-span-2">
          <CardLabel>Brand guidelines</CardLabel>
          <p className="mt-3 text-sm text-ink-navy/55">
            Upload a guidelines document and Marlowe reads it, then fills the cards above for you to
            check.
          </p>
          <ul className="mt-4 space-y-2">
            {brain.assets
              .filter((a) => a.kind === "document")
              .map((a) => (
                <li key={a.id} className="text-sm text-ink-navy/70">
                  {a.file_name}
                </li>
              ))}
          </ul>
          <FilePick
            label="Upload guidelines and read them"
            accept=".pdf,.doc,.docx,.txt,.md"
            onPick={async (file) => {
              setStatus("Reading your guidelines…");
              try {
                const path = await upload(file, "document", brain.brandId);
                const found = await analyse({
                  data: { brandId: brain.brandId, filePath: path, brandName: brain.name },
                });
                await persist({ brandId: brain.brandId, ...found });
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't read that document.");
                setStatus(null);
              }
            }}
          />
        </Card>

        {brain.learned.length ? (
          <Card dark className="lg:col-span-2">
            <CardLabel>What's working for this brand</CardLabel>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {brain.learned.map((l) => (
                <li key={l} className="flex gap-3 text-sm leading-relaxed text-white/85">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {l}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function FilePick({
  label,
  accept,
  onPick,
}: {
  label: string;
  accept: string;
  onPick: (file: File) => Promise<void>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          try {
            await onPick(file);
          } finally {
            setBusy(false);
            if (ref.current) ref.current.value = "";
          }
        }}
      />
      <button onClick={() => ref.current?.click()} className={`${pillClass} mt-5`} disabled={busy}>
        {busy ? "Working…" : label}
      </button>
    </>
  );
}

function PaletteEditor({
  value,
  onSave,
}: {
  value: PaletteColour[];
  onSave: (palette: PaletteColour[]) => void;
}) {
  const [colours, setColours] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => setColours(value), [value]);

  return (
    <div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {colours.map((c, i) => (
          <div key={i}>
            <div
              className="h-20 rounded-2xl border border-app-line"
              style={{ backgroundColor: c.hex }}
            />
            {editing ? (
              <>
                <input
                  value={c.name}
                  onChange={(e) =>
                    setColours((p) => p.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                  className={`${inputClass} mt-2`}
                />
                <input
                  value={c.hex}
                  onChange={(e) =>
                    setColours((p) => p.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)))
                  }
                  className={`${inputClass} mt-1`}
                />
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-navy">{c.name}</p>
                <p className="text-xs text-ink-navy/45">{c.hex}</p>
              </>
            )}
          </div>
        ))}
        {colours.length === 0 && !editing ? (
          <p className="text-sm text-ink-navy/45">No colours yet.</p>
        ) : null}
      </div>
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => {
            if (editing) onSave(colours);
            setEditing((v) => !v);
          }}
          className={pillClass}
        >
          {editing ? "Save palette" : "Edit palette"}
        </button>
        {editing ? (
          <button
            onClick={() => setColours((p) => [...p, { name: "New", hex: "#000000" }])}
            className={pillClass}
          >
            Add colour
          </button>
        ) : null}
      </div>
    </div>
  );
}

function TypographyEditor({
  value,
  fonts,
  onSave,
  onUploadFont,
}: {
  value: { headline: string; body: string; notes: string };
  fonts: { id: string; file_name: string | null }[];
  onSave: (v: { headline: string; body: string; notes: string }) => void;
  onUploadFont: (file: File) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => setDraft(value), [value]);

  return (
    <div>
      {editing ? (
        <div className="mt-4 space-y-3">
          <input
            value={draft.headline}
            onChange={(e) => setDraft({ ...draft, headline: e.target.value })}
            placeholder="Headline typeface"
            className={inputClass}
          />
          <input
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            placeholder="Body typeface"
            className={inputClass}
          />
          <textarea
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Usage notes"
            rows={3}
            className={inputClass}
          />
        </div>
      ) : (
        <>
          <p className="display mt-4 text-3xl font-light tracking-tight">
            {value.headline || "No headline typeface set"}
          </p>
          <p className="mt-2 text-sm text-ink-navy/55">{value.body || "No body typeface set"}</p>
          {value.notes ? (
            <p className="mt-3 border-t border-app-line pt-3 text-sm text-ink-navy/70">
              {value.notes}
            </p>
          ) : null}
        </>
      )}

      {fonts.length ? (
        <ul className="mt-4 space-y-1 text-xs text-ink-navy/50">
          {fonts.map((f) => (
            <li key={f.id}>{f.file_name}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => {
            if (editing) onSave(draft);
            setEditing((v) => !v);
          }}
          className={pillClass}
        >
          {editing ? "Save typography" : "Edit typography"}
        </button>
      </div>
      <FilePick label="Upload font files" accept=".ttf,.otf,.woff,.woff2" onPick={onUploadFont} />
    </div>
  );
}

function LineEditor({
  value,
  placeholder,
  onSave,
}: {
  value: string[];
  placeholder: string;
  onSave: (lines: string[]) => void;
}) {
  const [lines, setLines] = useState(value);
  const [editing, setEditing] = useState(false);
  useEffect(() => setLines(value), [value]);

  return (
    <div>
      <ul className="mt-4 space-y-3">
        {lines.map((line, i) => (
          <li key={i}>
            {editing ? (
              <input
                value={line}
                onChange={(e) => setLines((p) => p.map((x, j) => (j === i ? e.target.value : x)))}
                className={inputClass}
              />
            ) : (
              <p className="text-sm leading-relaxed text-ink-navy/75">{line}</p>
            )}
          </li>
        ))}
        {lines.length === 0 && !editing ? (
          <li className="text-sm text-ink-navy/45">{placeholder}</li>
        ) : null}
      </ul>
      <div className="mt-5 flex gap-2">
        <button
          onClick={() => {
            if (editing) onSave(lines.filter((l) => l.trim()));
            setEditing((v) => !v);
          }}
          className={pillClass}
        >
          {editing ? "Save" : "Edit"}
        </button>
        {editing ? (
          <button onClick={() => setLines((p) => [...p, ""])} className={pillClass}>
            Add line
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AudienceEditor({
  audience,
  personas,
  onSave,
}: {
  audience: string;
  personas: Persona[];
  onSave: (audience: string, personas: Persona[]) => void;
}) {
  const [draft, setDraft] = useState(audience);
  const [people, setPeople] = useState(personas);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setDraft(audience);
    setPeople(personas);
  }, [audience, personas]);

  return (
    <div>
      {editing ? (
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder="Who is this brand for?"
          className={`${inputClass} mt-4`}
        />
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-ink-navy/70">
          {audience || "No audience described yet."}
        </p>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {people.map((p, i) => (
          <div key={i} className="rounded-2xl border border-app-line bg-app-bg/60 p-5">
            {editing ? (
              <>
                <input
                  value={p.name}
                  onChange={(e) =>
                    setPeople((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)),
                    )
                  }
                  className={inputClass}
                />
                <textarea
                  value={p.detail}
                  rows={3}
                  onChange={(e) =>
                    setPeople((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)),
                    )
                  }
                  className={`${inputClass} mt-2`}
                />
              </>
            ) : (
              <>
                <p className="text-sm text-ink-navy">{p.name}</p>
                <p className="mt-2 text-xs leading-relaxed text-ink-navy/55">{p.detail}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <button
          onClick={() => {
            if (editing) onSave(draft, people.filter((p) => p.name.trim()));
            setEditing((v) => !v);
          }}
          className={pillClass}
        >
          {editing ? "Save" : "Edit"}
        </button>
        {editing ? (
          <button
            onClick={() => setPeople((p) => [...p, { name: "New persona", detail: "" }])}
            className={pillClass}
          >
            Add persona
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CreateBrandFlow({
  onCancel,
  onCreate,
  onUpload,
  onAnalyse,
  onSave,
}: {
  onCancel?: () => void;
  onCreate: (name: string, website: string) => Promise<{ brandId: string }>;
  onUpload: (file: File, kind: string, brandId: string) => Promise<string>;
  onAnalyse: (
    brandId: string,
    filePath: string,
    brandName: string,
  ) => Promise<{
    palette: PaletteColour[];
    typography: { headline: string; body: string; notes: string };
    toneOfVoice: string[];
    personas: Persona[];
    audience: string;
  }>;
  onSave: (patch: any) => Promise<void>;
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<any>(null);

  async function start() {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const { brandId: id } = await onCreate(name, website);
      setBrandId(id);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't create that brand.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="New brand brain"
        title={step === 1 ? "Name the brand" : "Give Marlowe the raw material"}
        subtitle={
          step === 1
            ? "One brand brain holds the logo, colours, type, voice and audience."
            : "Upload the logo, any font files and the brand guidelines. Marlowe reads the guidelines and fills in the rest."
        }
      />

      {step === 1 ? (
        <Card>
          <label className="text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
            Brand name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputClass} mt-2`} />
          <label className="mt-5 block text-[0.62rem] tracking-[0.24em] text-ink-navy/45 uppercase">
            Website (optional)
          </label>
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
            className={`${inputClass} mt-2`}
          />
          <div className="mt-6 flex gap-3">
            <button onClick={start} className={pillPrimaryClass} disabled={busy || !name.trim()}>
              {busy ? "Creating…" : "Continue"}
            </button>
            {onCancel ? (
              <button onClick={onCancel} className={pillClass}>
                Cancel
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}
        </Card>
      ) : (
        <Card>
          <CardLabel>Uploads</CardLabel>
          <div className="mt-4 space-y-4">
            <FilePick
              label="Upload logo"
              accept="image/*"
              onPick={async (file) => {
                await onUpload(file, "logo", brandId!);
                setNote("Logo saved.");
              }}
            />
            <FilePick
              label="Upload font files"
              accept=".ttf,.otf,.woff,.woff2"
              onPick={async (file) => {
                await onUpload(file, "font", brandId!);
                setNote("Font saved.");
              }}
            />
            <FilePick
              label="Upload brand guidelines"
              accept=".pdf,.doc,.docx,.txt,.md"
              onPick={async (file) => {
                setNote("Reading your guidelines…");
                setError(null);
                try {
                  const path = await onUpload(file, "document", brandId!);
                  const result = await onAnalyse(brandId!, path, name);
                  setFound(result);
                  setNote("Marlowe read it — check what it found below.");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Couldn't read that document.");
                  setNote(null);
                }
              }}
            />
          </div>

          {note ? <p className="mt-4 text-xs text-cerulean">{note}</p> : null}
          {error ? <p className="mt-4 text-xs text-red-600">{error}</p> : null}

          {found ? (
            <div className="mt-6 rounded-2xl border border-app-line bg-app-bg/60 p-5">
              <p className="text-sm text-ink-navy">What Marlowe found</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {found.palette.map((c: PaletteColour) => (
                  <span
                    key={c.hex + c.name}
                    className="flex items-center gap-2 rounded-full border border-app-line bg-app-card px-3 py-1 text-xs text-ink-navy/70"
                  >
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: c.hex }}
                    />
                    {c.name}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm text-ink-navy/65">
                {found.typography.headline} · {found.typography.body}
              </p>
              <ul className="mt-3 space-y-1 text-xs text-ink-navy/55">
                {found.toneOfVoice.slice(0, 4).map((t: string) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              onClick={async () => {
                setBusy(true);
                await onSave({ brandId: brandId!, ...(found ?? {}) });
                setBusy(false);
              }}
              className={pillPrimaryClass}
              disabled={busy}
            >
              {busy ? "Saving…" : "Open the brand brain"}
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
