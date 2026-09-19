/**
 * Server-only Lovable AI Gateway helpers.
 * Never import this from client code.
 */

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey() {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this workspace yet.");
  return key;
}

export type GatewayFile = { filename: string; mimeType: string; base64: string };

type JsonSchema = Record<string, unknown>;

/**
 * Structured JSON generation on the Responses API. Always streams (reasoning
 * models routinely run for minutes); the deltas are accumulated server-side.
 */
export async function generateJSON<T>({
  system,
  prompt,
  schemaName,
  schema,
  file,
}: {
  system?: string;
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
  file?: GatewayFile;
}): Promise<T> {
  const key = apiKey();

  const userContent: Record<string, unknown>[] = [{ type: "input_text", text: prompt }];
  if (file) {
    userContent.push({
      type: "input_file",
      filename: file.filename,
      file_data: `data:${file.mimeType};base64,${file.base64}`,
    });
  }

  const input: Record<string, unknown>[] = [];
  if (system) {
    input.push({ role: "system", content: [{ type: "input_text", text: system }] });
  }
  input.push({ role: "user", content: userContent });

  const res = await fetch(`${GATEWAY}/responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      input,
      stream: true,
      store: false,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
    }),
  });

  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 500)}`);
  }

  const text = await accumulateOutputText(res.body);
  if (!text.trim()) throw new Error("The AI returned an empty response.");
  return JSON.parse(text) as T;
}

async function accumulateOutputText(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let out = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";
    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            out += event.delta;
          } else if (event.type === "response.completed" && event.response?.output_text) {
            if (!out) out = event.response.output_text;
          }
        } catch {
          /* ignore keep-alive frames */
        }
      }
    }
  }
  return out;
}

/** Image generation. Returns raw bytes plus content type, ready for storage. */
export async function generateImage(prompt: string, size = "1024x1024") {
  const key = apiKey();
  const res = await fetch(`${GATEWAY}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({ model: "lovable/image-standard", prompt, size, n: 1 }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Image request failed [${res.status}]: ${body.slice(0, 500)}`);
  }

  const json = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const first = json.data?.[0];
  if (first?.b64_json) {
    return { bytes: base64ToBytes(first.b64_json), contentType: "image/png" };
  }
  if (first?.url) {
    const img = await fetch(first.url);
    const buf = new Uint8Array(await img.arrayBuffer());
    return { bytes: buf, contentType: img.headers.get("content-type") ?? "image/png" };
  }
  throw new Error("The image service returned no image.");
}

export function base64ToBytes(b64: string) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
