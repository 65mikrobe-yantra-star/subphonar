import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { chat } from "@/lib/ai.functions";
import { FileUploadZone } from "@/components/FileUploadZone";
import type { FileBlock, Klausur, MockExam, MockExamQuestion } from "@/lib/types";

type Props = {
  klausur: Klausur;
  systemPrompt: string;
  contextFiles: FileBlock[];
  update: (k: Klausur) => void;
};

const SCHWIER = ["leicht", "mittel", "schwer", "fies"] as const;

export function PruefungsTab({ klausur, systemPrompt, contextFiles, update }: Props) {
  const chatFn = useServerFn(chat);
  const exams = klausur.exams ?? [];
  const altklausuren = klausur.altklausuren ?? [];

  const [schwer, setSchwer] = useState<(typeof SCHWIER)[number]>("mittel");
  const [format, setFormat] = useState("Mischung aus Kurzfragen, Rechenaufgabe und einer langen Erörterung");
  const [fokus, setFokus] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const active = exams.find((e) => e.id === activeId) ?? null;

  function toggleFokus(name: string) {
    setFokus((f) => (f.includes(name) ? f.filter((x) => x !== name) : [...f, name]));
  }

  async function generieren() {
    setLoading(true);
    setError(null);
    try {
      const stilHinweis = altklausuren.length
        ? `Hier sind ${altklausuren.length} Altklausur(en) als Referenz für den Stil des Lehrers — orientiere dich an Wortwahl, Aufgabentypen und Schwierigkeitsgrad.`
        : "";
      const prompt = `Erstelle eine Probeklausur für "${klausur.title}".
Schwierigkeit: ${schwer === "fies" ? "FIES — wie ein gemeiner Lehrer der Lücken finden will" : schwer}
Format: ${format}
${fokus.length ? `Fokus-Themen: ${fokus.join(", ")}` : "Alle Themen abdecken."}
${stilHinweis}

Erstelle 5–8 Fragen mit unterschiedlichen Typen. Bei "schwer" oder "fies" mindestens 2 lange Erörterungsfragen die tiefes Verständnis fordern und auf Querverbindungen abzielen.

Antworte NUR als JSON (keine Backticks, kein Markdown):
{"questions":[{"id":1,"type":"kurz|lang|rechnung|mc","thema":"...","punkte":5,"frage":"...","choices":["A","B"],"musterloesung":"Kurze Musterlösung für Vergleich."}]}`;

      const res = await chatFn({
        data: {
          systemPrompt,
          messages: [{ role: "user", content: prompt }],
          files: [...contextFiles, ...altklausuren],
          model: "google/gemini-2.5-flash",
        },
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as { questions: MockExamQuestion[] };
      const max = parsed.questions.reduce((a, q) => a + (q.punkte || 0), 0);
      const exam: MockExam = {
        id: Date.now(),
        createdAt: new Date().toISOString(),
        schwierigkeit: schwer,
        format,
        fokusThemen: fokus,
        questions: parsed.questions,
        answers: parsed.questions.map((q) => ({ questionId: q.id, antwort: "" })),
        maxpunkte: max,
      };
      update({ ...klausur, exams: [exam, ...exams] });
      setActiveId(exam.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Parsing fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  function setAnswer(qid: number, txt: string) {
    if (!active) return;
    const u: MockExam = {
      ...active,
      answers: active.answers.map((a) => (a.questionId === qid ? { ...a, antwort: txt } : a)),
    };
    update({ ...klausur, exams: exams.map((e) => (e.id === u.id ? u : e)) });
  }

  async function bewerten() {
    if (!active) return;
    setLoading(true);
    setError(null);
    try {
      const block = active.questions
        .map((q) => {
          const a = active.answers.find((x) => x.questionId === q.id);
          return `--- Frage ${q.id} [${q.type}, max ${q.punkte} P., Thema: ${q.thema}] ---
FRAGE: ${q.frage}
MUSTER: ${q.musterloesung ?? "—"}
SCHÜLER-ANTWORT: ${a?.antwort || "(leer)"}`;
        })
        .join("\n\n");

      const prompt = `Du bist ein anspruchsvoller, fairer Lehrer (${active.schwierigkeit}). Bewerte jede Antwort.
Für jede Frage: vergebene Punkte (0..max), kurzes Feedback, was war richtig, was fehlt, wo muss der Schüler konkreter werden.

Antworte NUR als JSON:
{"items":[{"questionId":1,"punkte":4,"feedback":"..."}],"gesamtfeedback":"Zusammenfassung mit den 3 größten Baustellen und konkreten Verbesserungsvorschlägen."}

${block}`;

      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files: contextFiles, model: "google/gemini-2.5-flash" },
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as {
        items: { questionId: number; punkte: number; feedback: string }[];
        gesamtfeedback: string;
      };
      const updated: MockExam = {
        ...active,
        answers: active.answers.map((a) => {
          const it = parsed.items.find((x) => x.questionId === a.questionId);
          return it ? { ...a, punkte: it.punkte, feedback: it.feedback } : a;
        }),
        gesamtfeedback: parsed.gesamtfeedback,
        gesamtpunkte: parsed.items.reduce((s, i) => s + (i.punkte || 0), 0),
        done: true,
      };
      update({ ...klausur, exams: exams.map((e) => (e.id === updated.id ? updated : e)) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bewertung fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  }

  function deleteExam(id: number) {
    update({ ...klausur, exams: exams.filter((e) => e.id !== id) });
    if (activeId === id) setActiveId(null);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight, marginBottom: 12 }}>
          ✦ Neue Probeklausur generieren
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Schwierigkeit
            </div>
            <select style={{ ...s.sel, marginBottom: 0 }} value={schwer} onChange={(e) => setSchwer(e.target.value as (typeof SCHWIER)[number])}>
              {SCHWIER.map((x) => (
                <option key={x} value={x}>
                  {x === "fies" ? "Fies (gemeiner Lehrer)" : x.charAt(0).toUpperCase() + x.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Format
            </div>
            <input style={{ ...s.inp, marginBottom: 0 }} value={format} onChange={(e) => setFormat(e.target.value)} />
          </div>
        </div>
        {klausur.themen.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Fokus-Themen (optional)
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {klausur.themen.map((t) => {
                const on = fokus.includes(t.name);
                return (
                  <button
                    key={t.id}
                    onClick={() => toggleFokus(t.name)}
                    style={{
                      background: on ? C.purple : "transparent",
                      color: on ? "#fff" : C.textMuted,
                      border: `1px solid ${on ? C.purple : C.border}`,
                      borderRadius: 99,
                      padding: "3px 11px",
                      fontSize: 11,
                      cursor: "pointer",
                    }}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 10, color: C.textDim, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Altklausuren (optional, für Lehrerstil)
          </div>
          <FileUploadZone
            files={altklausuren}
            onAdd={(f) => update({ ...klausur, altklausuren: [...altklausuren, ...f] })}
            onRemove={(i) => update({ ...klausur, altklausuren: altklausuren.filter((_, j) => j !== i) })}
          />
        </div>

        <button style={{ ...s.btnP, width: "auto", padding: "9px 22px", marginTop: 8 }} onClick={() => void generieren()} disabled={loading}>
          {loading ? "Generiere…" : "✦ Probeklausur erstellen"}
        </button>
        {error && <div style={{ color: "#F09595", fontSize: 12, marginTop: 8 }}>{error}</div>}
      </div>

      {exams.length > 0 && !active && (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ fontSize: 12, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Bisherige Probeklausuren</div>
          {exams.map((e) => (
            <div
              key={e.id}
              style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                padding: 12,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>
                  {new Date(e.createdAt).toLocaleString("de-DE")} · {e.schwierigkeit}
                </div>
                <div style={{ fontSize: 11, color: C.textMuted }}>
                  {e.questions.length} Fragen · {e.done ? `${e.gesamtpunkte}/${e.maxpunkte} Punkte` : "noch nicht bewertet"}
                </div>
              </div>
              <button style={{ ...s.smallBtn(C.purple), padding: "5px 12px", fontSize: 11 }} onClick={() => setActiveId(e.id)}>
                Öffnen
              </button>
              <button style={s.smallBtn(C.red)} onClick={() => deleteExam(e.id)}>
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {active && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: "flex", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight }}>
              Probeklausur · {active.schwierigkeit}
              {active.done && active.gesamtpunkte != null && (
                <span style={{ marginLeft: 10, color: C.amber }}>
                  {active.gesamtpunkte}/{active.maxpunkte} P.
                </span>
              )}
            </div>
            <button style={{ ...s.btnS, width: "auto", padding: "5px 12px", marginLeft: "auto", marginBottom: 0 }} onClick={() => setActiveId(null)}>
              ← Liste
            </button>
          </div>

          <div style={{ display: "grid", gap: 14 }}>
            {active.questions.map((q, idx) => {
              const a = active.answers.find((x) => x.questionId === q.id);
              return (
                <div key={q.id} style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: C.textMuted, marginBottom: 6 }}>
                    <span style={s.pill(C.purpleDim, C.purpleLight)}>{idx + 1}</span>
                    <span style={s.pill(C.amberDim, C.amber)}>{q.type}</span>
                    <span style={{ marginLeft: "auto" }}>{q.punkte} P.</span>
                  </div>
                  <div style={{ fontSize: 13, color: C.text, marginBottom: 8, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{q.frage}</div>
                  {q.choices && (
                    <ul style={{ margin: "0 0 8px 0", paddingLeft: 18, color: C.textMuted, fontSize: 12 }}>
                      {q.choices.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                  <textarea
                    style={{ ...s.ta, marginBottom: 0, minHeight: q.type === "lang" ? 130 : 70 }}
                    placeholder="Deine Antwort…"
                    value={a?.antwort || ""}
                    onChange={(e) => setAnswer(q.id, e.target.value)}
                    disabled={active.done}
                  />
                  {a?.punkte != null && (
                    <div style={{ marginTop: 8, padding: 10, background: C.tealDim, borderRadius: 8, border: `1px solid ${C.teal}33` }}>
                      <div style={{ fontSize: 11, color: C.teal, fontWeight: 700, marginBottom: 4 }}>
                        {a.punkte}/{q.punkte} Punkte
                      </div>
                      <div style={{ fontSize: 12, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{a.feedback}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!active.done && (
            <button style={{ ...s.btnP, width: "auto", padding: "9px 22px", marginTop: 14 }} onClick={() => void bewerten()} disabled={loading}>
              {loading ? "Bewerte…" : "✦ Antworten bewerten lassen"}
            </button>
          )}
          {active.done && active.gesamtfeedback && (
            <div style={{ marginTop: 14, padding: 14, background: C.purpleDim, border: `1px solid ${C.purple}55`, borderRadius: 10 }}>
              <div style={{ fontSize: 11, color: C.purpleLight, fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                Gesamtfeedback
              </div>
              <div style={{ fontSize: 13, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{active.gesamtfeedback}</div>
            </div>
          )}
          {error && <div style={{ color: "#F09595", fontSize: 12, marginTop: 8 }}>{error}</div>}
        </div>
      )}
    </div>
  );
}
