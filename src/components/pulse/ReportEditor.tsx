import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bold, Code, Download, FileText, Italic, Pencil, Trash2, ArrowLeft, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Loading, Panel } from "@/components/pulse/ui";
import { deleteReport, getReport, saveReport } from "@/lib/pulse/report.functions";
import { renderReportHtml } from "@/lib/pulse/report/render";
import { reportFilename } from "@/lib/pulse/report/document";
import { downloadReportHtml, standaloneReport, safeReportHtml } from "@/lib/pulse/report/export";

const input = "w-full rounded-md border border-p-line bg-p-bg px-3 py-2 text-sm text-p-text outline-none focus:border-p-cerulean";

export function ReportEditor({ id, canWrite, onClose }: { id: string; canWrite: boolean; onClose: () => void }) {
  const fetchOne = useServerFn(getReport);
  const save = useServerFn(saveReport);
  const del = useServerFn(deleteReport);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["pulse", "report", id], queryFn: () => fetchOne({ data: { id } }) });
  const [doc, setDoc] = useState<Record<string, any> | null>(null);
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState<"visual" | "source">("visual");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [prepared, setPrepared] = useState<string | null>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const selected = useRef<HTMLElement | null>(null);
  const [selection, setSelection] = useState<{ tag: string; size: string; color: string; background: string; src: string } | null>(null);

  useEffect(() => {
    if (!q.data) return;
    setDoc(q.data.data);
    const data = q.data.data;
    const visible = ["web", data["showGmb"] ? "gmb" : null, data["showSocial"] ? "social" : null, "sum"].filter(Boolean);
    const pg = Object.fromEntries(["web", "gmb", "social", "sum"].map((key, i) => [String(i + 1).padStart(2, "0"), `${String(visible.indexOf(key) + 1).padStart(2, "0")} / ${String(visible.length).padStart(2, "0")}`]));
    setHtml(renderReportHtml({ ...data, pg }, window.location.origin));
  }, [q.data]);

  const snapshot = () => {
    if (mode === "source") return safeReportHtml(html);
    const content = frame.current?.contentDocument;
    if (!content) return html;
    const clone = content.documentElement.cloneNode(true) as HTMLElement;
    clone.querySelector("body")?.removeAttribute("contenteditable");
    clone.querySelector("body")?.style.removeProperty("zoom");
    return safeReportHtml(`<!DOCTYPE html>\n${clone.outerHTML}`);
  };
  const invalidateExport = () => setPrepared(null);
  const fit = () => {
    const f = frame.current;
    if (f?.contentDocument?.body) f.contentDocument.body.style.zoom = String(Math.min(1, Math.max(0.1, (f.clientWidth - 24) / 794)));
  };
  useEffect(() => {
    const f = frame.current;
    if (!f) return;
    const observer = new ResizeObserver(fit);
    observer.observe(f);
    return () => observer.disconnect();
  }, [!!doc]);
  const loadFrame = () => {
    fit();
    selected.current = null;
    setSelection(null);
    const content = frame.current?.contentDocument;
    if (!content) return;
    if (canWrite && mode === "visual") content.body.contentEditable = "true";
    content.addEventListener("input", invalidateExport);
    content.addEventListener("click", (event) => {
      event.preventDefault();
      const element = event.target;
      if (!element || !("nodeType" in element) || element.nodeType !== 1) return;
      selected.current = element as HTMLElement;
      const style = frame.current?.contentWindow?.getComputedStyle(element as HTMLElement);
      setSelection({ tag: (element as HTMLElement).tagName.toLowerCase(), size: style?.fontSize ?? "", color: (element as HTMLElement).style.color, background: (element as HTMLElement).style.background, src: (element as HTMLElement).getAttribute("src") ?? "" });
    });
  };
  const updateStyle = (key: "fontSize" | "color" | "background", value: string) => {
    if (!selected.current || !canWrite) return;
    selected.current.style[key] = value;
    setSelection((old) => old ? { ...old, [key === "fontSize" ? "size" : key]: value } : old);
    invalidateExport();
  };
  const switchMode = (next: "visual" | "source") => {
    setHtml(snapshot());
    setMode(next);
    selected.current = null;
    setSelection(null);
  };
  const persist = async (status: "draft" | "approved") => {
    if (!doc || busy) return;
    setBusy(true); setMessage("");
    try {
      await save({ data: { id, status, patch: { period: String(doc["period"]), customHtml: snapshot() } } });
      await qc.invalidateQueries({ queryKey: ["pulse", "report", id] });
      setMessage(status === "approved" ? "Approved." : "Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save the report."); }
    finally { setBusy(false); }
  };
  const filename = useMemo(() => reportFilename(doc?.["clientName"], doc?.["period"]), [doc]);
  const previewHtml = useMemo(() => html ? safeReportHtml(html) : "", [html]);
  if (!doc || !q.data) return <Loading />;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={onClose}><ArrowLeft />All reports</Button>
      <div className="flex gap-1" role="group" aria-label="Report editing mode">
        <Button variant={mode === "visual" ? "secondary" : "ghost"} onClick={() => switchMode("visual")}><Pencil />Visual</Button>
        <Button variant={mode === "source" ? "secondary" : "ghost"} onClick={() => switchMode("source")}><Code />HTML & CSS</Button>
      </div>
      <Button variant="outline" onClick={() => {
        const f = frame.current;
        if (!f?.contentDocument) return;
        f.contentDocument.body.style.zoom = "1";
        f.contentWindow?.print(); fit();
      }}><FileText />Download PDF</Button>
      <Button variant="outline" disabled={busy} onClick={async () => {
        if (prepared) { downloadReportHtml(prepared, filename); return; }
        setBusy(true); setMessage("");
        try { setPrepared(await standaloneReport(snapshot(), window.location.origin)); }
        catch (error) { setMessage(error instanceof Error ? error.message : "Could not export HTML."); }
        finally { setBusy(false); }
      }}><Download />{prepared ? "Download HTML" : "Prepare HTML"}</Button>
      {canWrite && <>
        <Button variant="outline" disabled={busy} onClick={() => persist("draft")}>Save draft</Button>
        <Button disabled={busy} onClick={() => persist("approved")}>Approve</Button>
        <Button variant="ghost" size="icon" title="Delete report" aria-label="Delete report" disabled={busy} onClick={async () => {
          if (!confirm("Delete this report?")) return;
          try { await del({ data: { id } }); onClose(); }
          catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete report."); }
        }}><Trash2 /></Button>
      </>}
      <span className="text-xs text-p-muted">{q.data.status === "approved" ? "Approved" : "Draft"}</span>
    </div>
    {message && <p role="status" className="text-sm text-p-muted">{message}</p>}
    <div className={`grid gap-4 ${mode === "source" ? "xl:grid-cols-2" : "lg:grid-cols-[240px_minmax(0,1fr)]"}`}>
      {mode === "source" ? <textarea aria-label="Report HTML and CSS" spellCheck={false} readOnly={!canWrite} className={`${input} h-[75vh] min-h-[600px] resize-y font-mono text-xs`} value={html} onChange={(event) => { setHtml(event.target.value); invalidateExport(); }} /> :
        <div className="space-y-4">
          <Panel title="Report details">
            <label className="block space-y-1 text-xs text-p-muted">Archive period<input className={input} maxLength={60} disabled={!canWrite} value={doc["period"]} onChange={(event) => { setDoc({ ...doc, period: event.target.value }); invalidateExport(); }} /></label>
          </Panel>
          {canWrite && <Panel title={selection ? `Selected: ${selection.tag}` : "Selection"}>
            <div className="space-y-3">
              <div className="flex gap-1">
                {[{ icon: Bold, command: "bold", label: "Bold" }, { icon: Italic, command: "italic", label: "Italic" }].map(({ icon: Icon, command, label }) => <Button key={command} variant="outline" size="icon" aria-label={label} title={label} onMouseDown={(event) => event.preventDefault()} onClick={() => { frame.current?.contentDocument?.execCommand(command); invalidateExport(); }}><Icon /></Button>)}
              </div>
              {selection && <>
                <label className="block space-y-1 text-xs text-p-muted">Font size<input className={input} value={selection.size} onChange={(event) => updateStyle("fontSize", event.target.value)} /></label>
                <label className="block space-y-1 text-xs text-p-muted">Text colour<input className={input} value={selection.color} onChange={(event) => updateStyle("color", event.target.value)} /></label>
                <label className="block space-y-1 text-xs text-p-muted">Background<input className={input} value={selection.background} onChange={(event) => updateStyle("background", event.target.value)} /></label>
                {selection.tag === "img" && <label className="block space-y-1 text-xs text-p-muted">Image URL<input className={input} value={selection.src} onChange={(event) => { selected.current?.setAttribute("src", event.target.value); setSelection({ ...selection, src: event.target.value }); invalidateExport(); }} /></label>}
                <div className="flex gap-1">
                  <Button variant="outline" size="icon" title="Move element up" aria-label="Move element up" onClick={() => { const el = selected.current; if (el?.previousElementSibling) el.parentElement?.insertBefore(el, el.previousElementSibling); invalidateExport(); }}><ArrowUp /></Button>
                  <Button variant="outline" size="icon" title="Move element down" aria-label="Move element down" onClick={() => { const el = selected.current; if (el?.nextElementSibling) el.parentElement?.insertBefore(el.nextElementSibling, el); invalidateExport(); }}><ArrowDown /></Button>
                  <Button variant="outline" size="icon" title="Remove element" aria-label="Remove element" onClick={() => { selected.current?.remove(); selected.current = null; setSelection(null); invalidateExport(); }}><Trash2 /></Button>
                </div>
              </>}
            </div>
          </Panel>}
        </div>}
      <div className="min-w-0 overflow-hidden rounded-md border border-p-line bg-p-bg">
        <iframe ref={frame} sandbox="allow-same-origin allow-modals" title="Report preview" srcDoc={previewHtml} onLoad={loadFrame} className="h-[75vh] min-h-[600px] w-full" />
      </div>
    </div>
  </div>;
}