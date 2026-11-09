import { z } from "zod";

/** Report-only edits never change the underlying analytics. Legacy patches remain valid. */
export const reportPatchSchema = z.object({
  period: z.string().min(1).max(60),
  customHtml: z.string().max(5_000_000).nullable().optional(),
}).catchall(z.unknown());

export const reportSaveSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "approved"]),
  patch: reportPatchSchema,
});

export function reportFilename(client: unknown, period: unknown) {
  const stem = `${String(client ?? "Report")} ${String(period ?? "")}`
    .replace(/[^\p{L}\p{N}._ -]/gu, "-").trim().replace(/\s+/g, "-");
  return `${stem || "Report"}.html`;
}