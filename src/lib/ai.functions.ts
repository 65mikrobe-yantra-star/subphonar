import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const FileBlockSchema = z.object({
  name: z.string(),
  type: z.enum(["pdf", "image", "text"]),
  data: z.string(),
  mimeType: z.string(),
});

const MessageSchema = z.object({
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
});

const ChatInput = z.object({
  systemPrompt: z.string().default(""),
  messages: z.array(MessageSchema).min(1),
  files: z.array(FileBlockSchema).default([]),
  model: z.string().default("google/gemini-2.5-flash"),
});

/**
 * Chat completion via Lovable AI Gateway (Gemini default).
 * Returns assistant text only — non-streaming for simplicity.
 *
 * Handles file blocks by converting:
 *  - text → inlined into the last user message
 *  - image → image_url content part (data URL)
 *  - pdf  → noted as attachment text (Gemini Flash via gateway accepts inline base64 PDFs
 *           on some endpoints; we degrade gracefully by including filename + a note)
 */
export const chat = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { text: "", error: "LOVABLE_API_KEY ist nicht konfiguriert." };
    }

    const messages = data.messages.map((m, i) => {
      const isLastUser = i === data.messages.length - 1 && m.role === "user" && data.files.length > 0;
      if (!isLastUser) return { role: m.role, content: m.content };

      // Build multimodal content for the last user message
      const parts: Array<Record<string, unknown>> = [];
      let extraText = "";
      for (const f of data.files) {
        if (f.type === "image") {
          parts.push({
            type: "image_url",
            image_url: { url: `data:${f.mimeType};base64,${f.data}` },
          });
        } else if (f.type === "text") {
          extraText += `\n\n--- Datei: ${f.name} ---\n${f.data}`;
        } else if (f.type === "pdf") {
          // Gateway doesn't reliably accept base64 PDFs across all models; mention the attachment.
          extraText += `\n\n[PDF angehängt: ${f.name} — Inhalt konnte nicht direkt eingelesen werden. Bitte beziehe dich auf den Dateinamen oder bitte den Nutzer, Kerninhalte als Text zu paste.]`;
        }
      }
      parts.push({ type: "text", text: m.content + extraText });
      return { role: m.role, content: parts };
    });

    if (data.systemPrompt) {
      messages.unshift({ role: "system", content: data.systemPrompt });
    }

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
        },
        body: JSON.stringify({
          model: data.model,
          messages,
          max_tokens: 4000,
        }),
      });

      if (res.status === 429) {
        return { text: "", error: "Rate-Limit erreicht. Bitte kurz warten." };
      }
      if (res.status === 402) {
        return { text: "", error: "AI-Kontingent verbraucht. Bitte Workspace-Credits aufladen." };
      }
      if (!res.ok) {
        const body = await res.text();
        return { text: "", error: `Gateway-Fehler ${res.status}: ${body.slice(0, 200)}` };
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      return { text, error: null as string | null };
    } catch (e) {
      return { text: "", error: e instanceof Error ? e.message : "Unbekannter Fehler" };
    }
  });
