import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { chat } from "@/lib/ai.functions";
import type { ChatMessage, FileBlock } from "@/lib/types";

type Props = {
  show: boolean;
  onClose: () => void;
  systemPrompt: string;
  files?: FileBlock[];
  extraContext?: string;
  actionLabel?: string;
  onAction?: (reply: string) => void;
};

export function AiPanel({ show, onClose, systemPrompt, files, extraContext, actionLabel, onAction }: Props) {
  const chatFn = useServerFn(chat);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const txt = input.trim();
    setInput("");
    const hist: ChatMessage[] = [...messages, { role: "user", content: txt }];
    setMessages(hist);
    setLoading(true);
    try {
      const res = await chatFn({ data: { systemPrompt, messages: hist, files: files ?? [], model: "google/gemini-2.5-flash" } });
      const reply = res.error ? `⚠️ ${res.error}` : res.text || "(Keine Antwort)";
      setMessages([...hist, { role: "assistant", content: reply }]);
      if (onAction && !res.error) onAction(reply);
    } catch {
      setMessages([...hist, { role: "assistant", content: "⚠️ Verbindungsfehler." }]);
    }
    setLoading(false);
  }

  if (!show) return null;
  return (
    <div style={s.aiPanel}>
      <div style={s.aiHeader}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
          }}
        >
          ✦
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.chatText }}>Subphonar KI</div>
          {extraContext && <div style={{ fontSize: 10, color: C.chatMuted }}>{extraContext}</div>}
        </div>
        <button
          style={{ marginLeft: "auto", background: "none", border: "none", color: C.chatMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      {files && files.length > 0 && (
        <div style={{ padding: "6px 14px", background: "#f0f0f8", borderBottom: `1px solid ${C.chatBorder}`, fontSize: 11, color: C.purple }}>
          📎 {files.length} Datei(en) im Kontext
        </div>
      )}
      {actionLabel && (
        <div style={{ padding: "6px 14px", background: "#f8f8fe", borderBottom: `1px solid ${C.chatBorder}`, fontSize: 11, color: C.chatMuted }}>
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
