import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { chat } from "@/lib/ai.functions";
import { cleanMarkdown } from "@/lib/helpers";
import type { ChatMessage, FileBlock } from "@/lib/types";

export type AiTool = {
  name: string;
  description: string;
  /** Führt die Aktion aus, gibt eine kurze menschenlesbare Bestätigung zurück. */
  run: (payload: unknown) => string;
};

type Props = {
  show: boolean;
  onClose: () => void;
  systemPrompt: string;
  files?: FileBlock[];
  extraContext?: string;
  actionLabel?: string;
  onAction?: (reply: string) => void;
  /** Persistiert die Chat-Historie im localStorage (pro Kontext eigener Key). */
  storageKey?: string;
  /** Tools, die die KI aufrufen kann, um App-Daten zu ändern. */
  tools?: AiTool[];
};

function loadHistory(key?: string): ChatMessage[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function getChatSummary(key: string, max = 110): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const msgs = JSON.parse(raw) as ChatMessage[];
    if (!msgs.length) return null;
    const lastUser = [...msgs].reverse().find((m) => m.role === "user");
    const lastBot = [...msgs].reverse().find((m) => m.role === "assistant");
    const u = lastUser?.content.replace(/\s+/g, " ").trim() ?? "";
    const b = lastBot?.content.replace(/\s+/g, " ").trim() ?? "";
    const clip = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() + "…" : t);
    if (!u && !b) return null;
    if (!b) return `„${clip(u, max)}“`;
    return `„${clip(u, 50)}“ → ${clip(b, max)}`;
  } catch {
    return null;
  }
}

export function AiPanel({ show, onClose, systemPrompt, files, extraContext, actionLabel, onAction, storageKey }: Props) {
  const chatFn = useServerFn(chat);
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadHistory(storageKey));
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (show) setMessages(loadHistory(storageKey));
  }, [show, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
    if (storageKey && typeof window !== "undefined") {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-20)));
      } catch { /* ignore quota */ }
    }
  }, [messages, storageKey]);

  async function send() {
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setInput("");
    const hist: ChatMessage[] = [...messages, { role: "user", content: txt }];
    setMessages(hist);
    setLoading(true);
    try {
      const res = await chatFn({ data: { systemPrompt, messages: hist, files: files ?? [], model: "google/gemini-2.5-flash" } });
      const raw = res.error ? `⚠️ ${res.error}` : res.text || "(Keine Antwort)";
      const reply = res.error ? raw : cleanMarkdown(raw);
      setMessages([...hist, { role: "assistant", content: reply }]);
      if (onAction && !res.error) onAction(reply);
    } catch {
      setMessages([...hist, { role: "assistant", content: "⚠️ Verbindungsfehler." }]);
    }
    setLoading(false);
  }

  function resetHistory() {
    setMessages([]);
    if (storageKey && typeof window !== "undefined") {
      window.localStorage.removeItem(storageKey);
    }
  }

  if (!show) return null;
  return (
    <div style={s.aiPanel}>
      <div style={s.aiHeader}>
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            color: "#fff",
          }}
        >
          ✦
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.chatText, letterSpacing: "-0.01em" }}>Subphonar KI</div>
          {extraContext && <div style={{ fontSize: 10.5, color: C.chatMuted }}>{extraContext}</div>}
        </div>
        {messages.length > 0 && (
          <button
            style={{ marginLeft: "auto", background: "none", border: "none", color: C.chatMuted, cursor: "pointer", fontSize: 11 }}
            onClick={resetHistory}
            title="Verlauf löschen"
          >
            Neu
          </button>
        )}
        <button
          style={{ marginLeft: messages.length > 0 ? 4 : "auto", background: "none", border: "none", color: C.chatMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {files && files.length > 0 && (
        <div style={{ padding: "6px 14px", background: "rgba(127,119,221,0.08)", borderBottom: `1px solid rgba(0,0,0,0.05)`, fontSize: 11, color: C.purple }}>
          📎 {files.length} Datei(en) im Kontext
        </div>
      )}
      {actionLabel && (
        <div style={{ padding: "6px 14px", background: "rgba(239,159,39,0.08)", borderBottom: `1px solid rgba(0,0,0,0.05)`, fontSize: 11, color: C.chatMuted }}>
          💡 {actionLabel}
        </div>
      )}
      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", padding: 24, color: C.chatMuted, fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✦</div>
            Wie kann ich dir beim Lernen helfen?
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={m.role === "user" ? s.aiMsgUser : s.aiMsgBot}>
            {m.content}
          </div>
        ))}
        {loading && <div style={{ ...s.aiMsgBot, color: C.chatMuted }}>…</div>}
        <div ref={endRef} />
      </div>
      <div style={s.aiInputRow}>
        <input
          style={s.aiInp}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nachricht eingeben…"
          onKeyDown={(e) => {
            if (e.key === "Enter") void send();
          }}
        />
        <button style={s.aiSend} onClick={() => void send()} disabled={loading}>
          →
        </button>
      </div>
    </div>
  );
}
