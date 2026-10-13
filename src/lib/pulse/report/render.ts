/** Fills the report template. Pure and browser-safe: values are HTML-escaped. */
import fontBold from "@/assets/report/hn-Bold.otf.asset.json";
import fontLight from "@/assets/report/hn-Light.otf.asset.json";
import fontMedium from "@/assets/report/hn-Medium.otf.asset.json";
import fontRoman from "@/assets/report/hn-Roman.otf.asset.json";
import logo from "@/assets/report/logo-white.png.asset.json";

import { REPORT_BODY } from "./template";

type Scope = Record<string, unknown>;

const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function get(scope: Scope, path: string): unknown {
  return path.split(".").reduce<unknown>((o, k) => (o == null ? undefined : (o as Scope)[k]), scope);
}

function fill(tpl: string, scope: Scope): string {
  // Innermost-first: loops and conditionals in the template are never nested in themselves.
  let out = tpl.replace(/<sc-for list="\{\{ ([\w.]+) \}\}" as="(\w+)">([\s\S]*?)<\/sc-for>/g, (_, list, as, body) => {
    const arr = (get(scope, list) as unknown[]) ?? [];
    return arr.map((item) => fill(body, { ...scope, [as]: item })).join("");
  });
  out = out.replace(/<sc-if value="\{\{ ([\w.]+) \}\}">([\s\S]*?)<\/sc-if>/g, (_, key, body) => (get(scope, key) ? fill(body, scope) : ""));
  return out.replace(/\{\{ ?([\w.]+) ?\}\}/g, (_, path) => esc(get(scope, path)));
}

export function renderReportHtml(data: Scope, origin: string) {
  const abs = (u: string) => (u.startsWith("http") ? u : origin + u);
  const face = (w: number, u: string) =>
    `@font-face{font-family:"Helvetica Neue";font-weight:${w};font-style:normal;font-display:block;src:url("${abs(u)}") format("opentype")}`;
  const css = [face(300, fontLight.url), face(400, fontRoman.url), face(500, fontMedium.url), face(700, fontBold.url)].join("");
  const body = fill(REPORT_BODY, { ...data, logo: abs(logo.url) });
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(data["clientName"])} — ${esc(data["period"])}</title>
<style>${css}
@page{size:A4;margin:0}
html,body{margin:0;background:#e9e6e1}
body{counter-reset:pg;-webkit-print-color-adjust:exact;print-color-adjust:exact}
section{margin:0 auto 16px;box-shadow:0 10px 30px -18px rgba(0,0,0,.4)}
section[data-pg]{counter-increment:pg}.pgnum::after{content:counter(pg,decimal-leading-zero)}
a{color:#036C89}
@media print{html,body{background:none}section{margin:0;box-shadow:none;break-after:page}}
</style></head><body>${body}</body></html>`;
}
