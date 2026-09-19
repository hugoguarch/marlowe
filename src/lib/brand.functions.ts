/**
 * Brand Brain — create brands, upload assets, extract guidelines with AI,
 * and persist every edit to brand_brain.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Ctx = { supabase: any; userId: string };

export type PaletteColour = { name: string; hex: string };
export type Persona = { name: string; detail: string };
export type Typography = { headline: string; body: string; notes: string };

export type BrandBrain = {
  brandId: string;
  name: string;
  website: string | null;
  logoPath: string | null;
  logoUrl: string | null;
  palette: PaletteColour[];
  typography: Typography;
  toneOfVoice: string[];
  personas: Persona[];
  audience: string;
  learned: string[];
  assets: { id: string; kind: string; file_name: string | null; file_path: string }[];
};

const emptyTypography: Typography = { headline: "", body: "", notes: "" };

async function signed(supabase: any, path: string | null) {
  if (!path) return null;
  const { data } = await supabase.storage.from("brand-assets").createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function loadBrain(ctx: Ctx, brandId: string): Promise<BrandBrain | null> {
  const { supabase, userId } = ctx;
  const { data: brand } = await supabase
    .from("brands")
    .select("id, name, website, logo_url")
    .eq("id", brandId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!brand) return null;

  const { data: brain } = await supabase
    .from("brand_brain")
    .select("palette, typography, tone_of_voice, personas, audience, learned, logo_url")
    .eq("brand_id", brandId)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: assets } = await supabase
    .from("brand_assets")
    .select("id, kind, file_name, file_path")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });

  const logoPath = (brand.logo_url as string | null) ?? (brain?.logo_url as string | null) ?? null;

  return {
    brandId: brand.id,
    name: brand.name,
    website: brand.website,
    logoPath,
    logoUrl: await signed(supabase, logoPath),
    palette: (brain?.palette as PaletteColour[]) ?? [],
    typography: { ...emptyTypography, ...((brain?.typography as Partial<Typography>) ?? {}) },
    toneOfVoice: (brain?.tone_of_voice as string[]) ?? [],
    personas: (brain?.personas as Persona[]) ?? [],
    audience: (brain?.audience as string | null) ?? "",
    learned: (brain?.learned as string[]) ?? [],
    assets: assets ?? [],
  };
}

/** Every brand the signed-in person owns. */
export const listBrands = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data } = await supabase
      .from("brands")
      .select("id, name, website")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    return (data ?? []) as { id: string; name: string; website: string | null }[];
  });

/** One brand with its full brain, or the first brand when no id is given. */
export const getBrandBrain = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId?: string } | undefined) => ({
    brandId: input?.brandId ?? null,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    let brandId = data.brandId;
    if (!brandId) {
      const { data: first } = await ctx.supabase
        .from("brands")
        .select("id")
        .eq("user_id", ctx.userId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      brandId = first?.id ?? null;
    }
    if (!brandId) return null;
    return loadBrain(ctx, brandId);
  });

/** Create a brand plus its empty brain record. */
export const createBrand = createServerFn({ method: "POST" })
  .inputValidator((input: { name: string; website?: string }) => {
    const name = String(input?.name ?? "").trim();
    if (!name) throw new Error("A brand needs a name.");
    return { name: name.slice(0, 120), website: input?.website?.trim().slice(0, 300) || null };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { data: brand, error } = await supabase
      .from("brands")
      .insert({ user_id: userId, name: data.name, website: data.website })
      .select("id")
      .single();
    if (error) throw error;

    const { error: brainError } = await supabase
      .from("brand_brain")
      .insert({ user_id: userId, brand_id: brand.id });
    if (brainError) throw brainError;

    return { brandId: brand.id as string };
  });

/** Record an uploaded file (logo, font, guidelines) against the brand. */
export const registerBrandAsset = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      brandId: string;
      kind: string;
      filePath: string;
      fileName?: string;
      mimeType?: string;
    }) => ({
      brandId: String(input.brandId),
      kind: String(input.kind ?? "document"),
      filePath: String(input.filePath),
      fileName: input.fileName ?? null,
      mimeType: input.mimeType ?? null,
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as Ctx;
    const { error } = await supabase.from("brand_assets").insert({
      user_id: userId,
      brand_id: data.brandId,
      kind: data.kind,
      file_path: data.filePath,
      file_name: data.fileName,
      mime_type: data.mimeType,
    });
    if (error) throw error;

    if (data.kind === "logo") {
      await supabase
        .from("brands")
        .update({ logo_url: data.filePath })
        .eq("id", data.brandId)
        .eq("user_id", userId);
      await supabase
        .from("brand_brain")
        .update({ logo_url: data.filePath })
        .eq("brand_id", data.brandId)
        .eq("user_id", userId);
    }

    return { ok: true };
  });

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["palette", "typography", "toneOfVoice", "personas", "audience"],
  properties: {
    palette: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "hex"],
        properties: { name: { type: "string" }, hex: { type: "string" } },
      },
    },
    typography: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "body", "notes"],
      properties: {
        headline: { type: "string" },
        body: { type: "string" },
        notes: { type: "string" },
      },
    },
    toneOfVoice: { type: "array", items: { type: "string" } },
    personas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "detail"],
        properties: { name: { type: "string" }, detail: { type: "string" } },
      },
    },
    audience: { type: "string" },
  },
};

type Extraction = {
  palette: PaletteColour[];
  typography: Typography;
  toneOfVoice: string[];
  personas: Persona[];
  audience: string;
};

/** Read an uploaded guidelines document and propose the brain fields. */
export const analyseGuidelines = createServerFn({ method: "POST" })
  .inputValidator((input: { brandId: string; filePath: string; brandName?: string }) => ({
    brandId: String(input.brandId),
    filePath: String(input.filePath),
    brandName: input.brandName ?? "",
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const { supabase } = context as unknown as Ctx;
    const { generateJSON, bytesToBase64 } = await import("@/lib/ai.server");

    const { data: file, error } = await supabase.storage
      .from("brand-assets")
      .download(data.filePath);
    if (error || !file) throw new Error("Could not open that document.");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const name = data.filePath.split("/").pop() ?? "guidelines";
    const mimeType = file.type || (name.endsWith(".pdf") ? "application/pdf" : "text/plain");

    const result = await generateJSON<Extraction>({
      system:
        "You read brand guideline documents and return the brand's visual and verbal identity. Be faithful to the document; never invent colours or fonts that are not in it. Hex values must be six-digit and start with #. Return at most six colours, six tone-of-voice lines and three personas.",
      prompt: `Extract the brand identity for ${data.brandName || "this brand"} from the attached guidelines. Give each colour a short human name (for example Ink, Cerulean). Typography: name the headline typeface, the body typeface, and short usage notes. Tone of voice: short, decisive rules. Personas: who this brand speaks to. Audience: one paragraph.`,
      schemaName: "brand_identity",
      schema: extractionSchema,
      file: { filename: name, mimeType, base64: bytesToBase64(bytes) },
    });

    return result;
  });

/** Save every editable brain field. */
export const saveBrandBrain = createServerFn({ method: "POST" })
  .inputValidator(
    (input: {
      brandId: string;
      name?: string;
      website?: string | null;
      palette?: PaletteColour[];
      typography?: Typography;
      toneOfVoice?: string[];
      personas?: Persona[];
      audience?: string;
    }) => ({
      brandId: String(input.brandId),
      name: input.name?.trim().slice(0, 120),
      website: input.website === undefined ? undefined : (input.website?.trim() || null),
      palette: Array.isArray(input.palette) ? input.palette.slice(0, 12) : undefined,
      typography: input.typography,
      toneOfVoice: Array.isArray(input.toneOfVoice) ? input.toneOfVoice.slice(0, 12) : undefined,
      personas: Array.isArray(input.personas) ? input.personas.slice(0, 8) : undefined,
      audience: input.audience?.slice(0, 2000),
    }),
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const ctx = context as unknown as Ctx;
    const { supabase, userId } = ctx;

    if (data.name !== undefined || data.website !== undefined) {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (data.name !== undefined) patch.name = data.name;
      if (data.website !== undefined) patch.website = data.website;
      await supabase.from("brands").update(patch).eq("id", data.brandId).eq("user_id", userId);
    }

    const brainPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (data.palette !== undefined) brainPatch.palette = data.palette;
    if (data.typography !== undefined) brainPatch.typography = data.typography;
    if (data.toneOfVoice !== undefined) brainPatch.tone_of_voice = data.toneOfVoice;
    if (data.personas !== undefined) brainPatch.personas = data.personas;
    if (data.audience !== undefined) brainPatch.audience = data.audience;

    const { data: existing } = await supabase
      .from("brand_brain")
      .select("id")
      .eq("brand_id", data.brandId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("brand_brain").update(brainPatch).eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("brand_brain")
        .insert({ user_id: userId, brand_id: data.brandId, ...brainPatch });
      if (error) throw error;
    }

    return loadBrain(ctx, data.brandId);
  });
