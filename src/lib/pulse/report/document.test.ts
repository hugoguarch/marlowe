import { describe, it as test } from "node:test";
import { strict as assert } from "node:assert";
import { reportSaveSchema, reportFilename } from "./document";

describe("complete report edits", () => {
  test("preserves every custom HTML element, figure and style", () => {
    const customHtml = '<!DOCTYPE html><html><head><style>h1{color:red}</style></head><body><h1>Custom report</h1><p>1234</p><img src="data:image/png;base64,test"></body></html>';
    const result = reportSaveSchema.parse({ id: "1b8991a4-aaaf-47e3-96fa-af6255205374", status: "draft", patch: { period: "October 2026", customHtml, k: { w0: { v: "1234" } } } });
    assert.equal(result.patch.customHtml, customHtml);
    assert.deepEqual(result.patch["k"], { w0: { v: "1234" } });
  });
  test("accepts existing narrative-only saves", () => {
    const result = reportSaveSchema.parse({ id: "1b8991a4-aaaf-47e3-96fa-af6255205374", status: "approved", patch: { period: "October", intro: "Hello", paras: [{ text: "Saved text" }] } });
    assert.deepEqual(result.patch["paras"], [{ text: "Saved text" }]);
  });
  test("exports HTML with a safe filename", () => {
    assert.equal(reportFilename("Client / One", "October 2026"), "Client---One-October-2026.html");
  });
});