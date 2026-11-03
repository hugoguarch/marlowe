/**
 * Built-in agent skills. Each playbook is a markdown file in ./skills/<id>.md with
 * `name` and `summary` front matter followed by the instructions.
 */
const files = import.meta.glob("./skills/*.md", { query: "?raw", import: "default", eager: true }) as Record<string, string>;

export type Skill = { id: string; name: string; summary: string; instructions: string };

/** Parse a skill markdown file (front matter + body). Also used for importing .md skills. */
export function parseSkillMd(text: string, fallbackId = "skill"): Skill {
  const m = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/.exec(text.trim());
  const meta: Record<string, string> = {};
  if (m) for (const line of m[1]!.split("\n")) { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  const body = (m ? m[2]! : text).trim();
  return { id: meta.id ?? fallbackId, name: meta.name ?? fallbackId, summary: meta.summary ?? "", instructions: body };
}

export function skillToMd(s: { name: string; summary: string; instructions: string }) {
  return `---\nname: ${s.name}\nsummary: ${s.summary}\n---\n\n${s.instructions}\n`;
}

export const SKILLS: Skill[] = Object.entries(files)
  .map(([path, text]) => parseSkillMd(text, path.split("/").pop()!.replace(/\.md$/, "")))
  .map((s, _i, all) => ({ ...s, id: s.id === "skill" ? s.name : s.id, _all: all }))
  .map(({ _all, ...s }) => s)
  .sort((a, b) => a.name.localeCompare(b.name));
