import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { chat } from "@/lib/ai.functions";
import type { ErklaerEntry, FileBlock, Klausur } from "@/lib/types";

type Props = {
  klausur: Klausur;
  systemPrompt: string;
  contextFiles: FileBlock[];
  update: (k: Klausur) => void;
};

const MODI = [
  { id: "erklaer", label: "Erklär's mir", hint: "Schritt für Schritt, mit Alltagsbeispielen (z.B. Skifahren)." },
  { id: "problem", label: "Mein Problem", hint: "Ich verstehe X nicht — wo ist mein Denkfehler?" },
  { id: "how", label: "Wie würdest du's machen?", hint: "Zeig mir deinen Lösungsweg an einem konkreten Fall." },
] as const;

export function ErklaerbaerTab({ klausur, systemPrompt, contextFiles, update }: Props) {
  const chatFn = useServerFn(chat);
  const eintraege = klausur.erklaerungen ?? [];
  const [mode, setMode] = useState<(typeof MODI)[number]["id"]>("erklaer");
  const [frage, setFrage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask() {
    if (!frage.trim()) return;
    setLoading(true);
    setError(null);
    const role =
      mode === "erklaer"
        ? "Du bist ein erfahrener, geduldiger Lehrer. Erkläre Schritt für Schritt, von einfach zu komplex. Nutze wo es passt eine Alltags-Analogie (z.B. Skifahren, Kochen, Fußball) damit es klick macht. Schließe mit einer Mini-Selbstüberprüfung."
        : mode === "problem"
          ? "Du bist ein Mentor. Hör genau zu, identifiziere den eigentlichen Denkfehler oder die Wissenslücke, erkläre WARUM das ein Stolperstein ist, und führe dann zur korrekten Sicht."
          : "Du bist ein Experte der laut denkt. Zeig deinen Lösungsweg als nummerierte Schritte, sag bei jedem Schritt warum du das so machst, und nenne typische Fallen.";
    try {
      const res = await chatFn({
        data: {
          systemPrompt: `${systemPrompt}\n\nZUSATZROLLE: ${role}`,
          messages: [{ role: "user", content: frage }],
          files: contextFiles,
          model: "google/gemini-2.5-flash",
        },
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const entry: ErklaerEntry = { id: Date.now(), frage, antwort: res.text, date: new Date().toISOString() };
      update({ ...klausur, erklaerungen: [entry, ...eintraege] });
      setFrage("");
    } finally {
      setLoading(false);
    }
  }

  function del(id: number) {
    update({ ...klausur, erklaerungen: eintraege.filter((e) => e.id !== id) });
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 16,
          padding: 18,
          boxShadow: "0 4px 20px -8px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight, marginBottom: 12, letterSpacing: "-0.01em" }}>🧑‍🏫 Erklärbär</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {MODI.map((m) => (
            <button key={m.id} style={s.tabBtn(mode === m.id, C.purple)} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: C.textMuted, marginBottom: 10, lineHeight: 1.5 }}>{MODI.find((m) => m.id === mode)?.hint}</div>
        <textarea
          style={{ ...s.ta, minHeight: 90 }}
          placeholder="Was willst du verstehen? Sei konkret…"
          value={frage}
          onChange={(e) => setFrage(e.target.value)}
        />
        <button
          style={{
            background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
            color: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "9px 22px",
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? "wait" : "pointer",
            boxShadow: `0 4px 14px -4px ${C.purple}88`,
          }}
          onClick={() => void ask()}
          disabled={loading}
        >
          {loading ? "Denke nach…" : "✦ Erkläre es mir"}
        </button>
        {error && <div style={{ color: "#F09595", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {eintraege.map((e) => (
        <div
          key={e.id}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "rgba(255,255,255,0.02)",
            border: `1px solid rgba(255,255,255,0.06)`,
            borderRadius: 16,
            padding: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: 10, color: C.textDim }}>{new Date(e.date).toLocaleString("de-DE")}</div>
            <button style={s.smallBtn(C.red)} onClick={() => del(e.id)}>✕</button>
          </div>
          {/* User-Bubble */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div
              style={{
                background: `linear-gradient(135deg, ${C.amber}, ${C.amber}dd)`,
                color: "#fff",
                borderRadius: "18px 18px 4px 18px",
                padding: "10px 14px",
                maxWidth: "85%",
                fontSize: 13,
                lineHeight: 1.5,
                fontWeight: 500,
                boxShadow: `0 4px 12px -4px ${C.amber}55`,
              }}
            >
              {e.frage}
            </div>
          </div>
          {/* KI-Bubble */}
          <div style={{ display: "flex", justifyContent: "flex-start", alignItems: "flex-end", gap: 8 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${C.purple}, ${C.purpleLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                color: "#fff",
                flexShrink: 0,
              }}
            >
              ✦
            </div>
            <div
              style={{
                background: "rgba(127,119,221,0.08)",
                border: `1px solid ${C.purple}22`,
                color: C.text,
                borderRadius: "18px 18px 18px 4px",
                padding: "12px 16px",
                maxWidth: "90%",
                fontSize: 13,
                lineHeight: 1.65,
                whiteSpace: "pre-wrap",
              }}
            >
              {e.antwort}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

