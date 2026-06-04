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
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight, marginBottom: 12 }}>🧑‍🏫 Erklärbär</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
          {MODI.map((m) => (
            <button key={m.id} style={s.tabBtn(mode === m.id, C.purple)} onClick={() => setMode(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 8 }}>{MODI.find((m) => m.id === mode)?.hint}</div>
        <textarea
          style={{ ...s.ta, minHeight: 90 }}
          placeholder="Was willst du verstehen? Sei konkret…"
          value={frage}
          onChange={(e) => setFrage(e.target.value)}
        />
        <button style={{ ...s.btnP, width: "auto", padding: "9px 22px" }} onClick={() => void ask()} disabled={loading}>
          {loading ? "Denke nach…" : "✦ Erkläre es mir"}
        </button>
        {error && <div style={{ color: "#F09595", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {eintraege.map((e) => (
        <div key={e.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "start", gap: 10, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: C.textDim, marginBottom: 3 }}>{new Date(e.date).toLocaleString("de-DE")}</div>
              <div style={{ fontSize: 13, color: C.amber, fontWeight: 600, lineHeight: 1.4 }}>❓ {e.frage}</div>
            </div>
            <button style={s.smallBtn(C.red)} onClick={() => del(e.id)}>
              ✕
            </button>
          </div>
          <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.65, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
            {e.antwort}
          </div>
        </div>
      ))}
    </div>
  );
}
