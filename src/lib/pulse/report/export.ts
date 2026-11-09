import DOMPurify from "dompurify";

export function safeReportHtml(html: string) {
  return DOMPurify.sanitize(html, { WHOLE_DOCUMENT: true, ADD_TAGS: ["style"], FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "base", "link", "meta"], ADD_ATTR: ["data-screen-label", "data-pg"] });
}

/** Make the exported document portable: images and font/CSS resources are embedded. */
export async function standaloneReport(html: string, origin: string): Promise<string> {
  const doc = new DOMParser().parseFromString(safeReportHtml(html), "text/html");
  const resources = new Map<string, Promise<string>>();
  const embed = (src: string) => {
    if (src.startsWith("data:") || src.startsWith("#")) return Promise.resolve(src);
    const url = new URL(src, origin).href;
    let pending = resources.get(url);
    if (!pending) {
      pending = fetch(url).then(async (response) => {
        if (!response.ok) throw new Error("An image or font could not be included in the HTML export.");
        const blob = await response.blob();
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not prepare the HTML file."));
          reader.readAsDataURL(blob);
        });
      });
      resources.set(url, pending);
    }
    return pending;
  };
  await Promise.all(Array.from(doc.querySelectorAll("img[src]")).map(async (img) => {
    const src = img.getAttribute("src");
    if (src) img.setAttribute("src", await embed(src));
    img.removeAttribute("srcset");
  }));
  await Promise.all(Array.from(doc.querySelectorAll("style, [style]")).map(async (node) => {
    const isStyle = node.tagName === "STYLE";
    let css = isStyle ? node.textContent ?? "" : node.getAttribute("style") ?? "";
    const matches = [...css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)];
    for (const match of matches) {
      const src = match[1]?.trim();
      if (src) css = css.replace(match[0], `url("${await embed(src)}")`);
    }
    if (isStyle) node.textContent = css;
    else node.setAttribute("style", css);
  }));
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

export function downloadReportHtml(html: string, filename: string) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const file = new File([blob], filename, { type: blob.type });
  if (matchMedia("(pointer: coarse)").matches && navigator.canShare?.({ files: [file] })) {
    void navigator.share({ files: [file], title: filename }).catch((error: unknown) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) downloadBlob(blob, filename);
    });
    return;
  }
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}