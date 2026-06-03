import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { AiPanel } from "@/components/AiPanel";
import { FileUploadZone } from "@/components/FileUploadZone";
import { FlashcardView, type Flashcard } from "@/components/FlashcardView";
import { APP_NAME, C, PRIORITY_COLORS } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { formatDate } from "@/lib/helpers";
import { chat } from "@/lib/ai.functions";
import type { FileBlock, Klausur, Prioritaet, Thema } from "@/lib/types";

export const Route = createFileRoute("/klausuren/$id")({
  head: () => ({
    meta: [{ title: `Klausur — ${APP_NAME}` }],
  }),
  component: KlausurDetail,
});

type Tab = "themen" | "flashcards" | "summary";

function KlausurDetail() {
  const { id } = Route.useParams();
  const [klausuren, setKlausuren] = useLocalStorage<Klausur[]>("sub.klausuren", []);
  const klausur = useMemo(() => klausuren.find((k) => String(k.id) === id), [klausuren, id]);

  const [tab, setTab] = useState<Tab>("themen");
  const [aiOpen, setAiOpen] = useState(false);
  const [showAddThema, setShowAddThema] = useState(false);
  const [newThema, setNewThema] = useState<Omit<Thema, "id">>({
    name: "",
    prioritaet: "mittel",
    zeit: "",
    keypoints: "",
    mindmap: "",
    offeneFragen: "",
  });
  const [klausurFiles, setKlausurFiles] = useState<FileBlock[]>([]);
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [fcLoading, setFcLoading] = useState(false);
  const [fcError, setFcError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const chatFn = useServerFn(chat);

  if (!klausur) {
    return (
      <div style={s.app}>
        <AppNav />
        <div style={s.main(false)}>
          <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤷</div>
            <div style={{ fontSize: 14, marginBottom: 14 }}>Klausur nicht gefunden</div>
            <Link
              to="/klausuren"
              style={{ ...s.btnP, width: "auto", padding: "9px 28px", display: "inline-block", textDecoration: "none" }}
            >
              ← Zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function sync(updated: Klausur) {
    setKlausuren(klausuren.map((k) => (k.id === updated.id ? updated : k)));
  }
  function updateThemaField<K extends keyof Thema>(tid: number, field: K, value: Thema[K]) {
    if (!klausur) return;
    sync({ ...klausur, themen: klausur.themen.map((t) => (t.id === tid ? { ...t, [field]: value } : t)) });
  }
  function deleteThema(tid: number) {
    if (!klausur) return;
    sync({ ...klausur, themen: klausur.themen.filter((t) => t.id !== tid) });
  }
  function addThema() {
    if (!newThema.name.trim() || !klausur) return;
    sync({ ...klausur, themen: [...klausur.themen, { ...newThema, id: Date.now() }] });
    setNewThema({ name: "", prioritaet: "mittel", zeit: "", keypoints: "", mindmap: "", offeneFragen: "" });
    setShowAddThema(false);
  }

  const systemPrompt = `Du bist ein Lernassistent für die Klausur "${klausur.title}" (${klausur.fach}, ${formatDate(klausur.datum)}). Probleme des Schülers: ${klausur.probleme}. Lösungsansätze: ${klausur.loesungen}. Themen: ${klausur.themen.map((t) => `${t.name} [Priorität: ${t.prioritaet}, KP: ${t.keypoints}]`).join("; ")}. Antworte präzise, strukturiert und auf Deutsch.`;

  async function generateFlashcards() {
    if (!klausur) return;
    setFcLoading(true);
    setFcError(null);
    setTab("flashcards");
    try {
      const prompt = `Erstelle genau 10 Flashcards für "${klausur.title}". Nutze Key Points und Themen. Antworte NUR mit JSON (keine Backticks, kein Markdown): {"cards":[{"question":"...","answer":"..."}]}. Teste echtes Verständnis, nicht nur Definitionen.`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files: klausurFiles, model: "google/gemini-2.5-flash" },
      });
      if (res.error) {
        setFcError(res.error);
        return;
      }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as { cards: Flashcard[] };
      setFlashcards(parsed.cards || []);
    } catch (e) {
      setFcError(e instanceof Error ? e.message : "Parsing fehlgeschlagen");
    } finally {
      setFcLoading(false);
    }
  }

  async function generateSummary() {
    if (!klausur) return;
    setSummaryLoading(true);
    setTab("summary");
    try {
      const prompt = `Executive Summary für "${klausur.title}". Struktur:\n# Executive Summary: ${klausur.title}\n## Kernkonzepte & Definitionen\n## Wichtigste Formeln\n## Zusammenhänge zwischen den Themen\n## Typische Klausurfallen\n## Last-Minute Checkliste (5 Punkte)\nSei präzise und prüfungsrelevant.`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files: klausurFiles, model: "google/gemini-2.5-flash" },
      });
      setSummary(res.error ? `⚠️ ${res.error}` : res.text);
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(aiOpen)}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <Link to="/klausuren" style={{ fontSize: 12, color: C.textMuted, textDecoration: "none" }}>
            ← Klausuren
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{klausur.title}</h1>
            <div style={{ ...s.pill(C.purpleDim, C.purpleLight), fontSize: 12, padding: "4px 12px" }}>{klausur.fach || "—"}</div>
            {klausur.datum && (
              <div style={{ ...s.pill(C.amberDim, C.amber), fontSize: 12, padding: "4px 12px" }}>{formatDate(klausur.datum)}</div>
            )}
            <button
              style={{ ...s.smallBtn(C.purple), marginLeft: "auto", padding: "6px 14px", fontSize: 12 }}
              onClick={() => setAiOpen(!aiOpen)}
            >
              ✦ KI-Chat
            </button>
          </div>
        </div>

        {/* Probleme & Lösungen */}
        {(klausur.probleme || klausur.loesungen) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
            {klausur.probleme && (
              <div style={{ background: C.redDim, border: `1px solid ${C.red}33`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: "#F09595", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
                  Wo's hakt
                </div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{klausur.probleme}</div>
              </div>
            )}
            {klausur.loesungen && (
              <div style={{ background: C.tealDim, border: `1px solid ${C.teal}33`, borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 10, color: "#5DCAA5", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 5 }}>
                  Lösungsweg
                </div>
                <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{klausur.loesungen}</div>
              </div>
            )}
          </div>
        )}

        {/* File upload */}
        <FileUploadZone
          files={klausurFiles}
          onAdd={(f) => setKlausurFiles([...klausurFiles, ...f])}
          onRemove={(i) => setKlausurFiles(klausurFiles.filter((_, j) => j !== i))}
          label="Lernmaterialien (für KI-Kontext)"
        />

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 18, marginTop: 8, flexWrap: "wrap" }}>
          <button style={s.tabBtn(tab === "themen", C.purple)} onClick={() => setTab("themen")}>
            📋 Themen ({klausur.themen.length})
          </button>
          <button
            style={s.tabBtn(tab === "flashcards", C.amber)}
            onClick={() => {
              if (flashcards.length === 0) void generateFlashcards();
              else setTab("flashcards");
            }}
          >
            🎴 Flashcards
          </button>
          <button
            style={s.tabBtn(tab === "summary", C.teal)}
            onClick={() => {
              if (!summary) void generateSummary();
              else setTab("summary");
            }}
          >
            📄 Summary
          </button>
        </div>

        {/* Tab content */}
        {tab === "themen" && (
          <div>
            <div style={{ marginBottom: 12 }}>
              <button style={{ ...s.smallBtn(C.teal), padding: "6px 14px", fontSize: 12 }} onClick={() => setShowAddThema(true)}>
                + Thema hinzufügen
              </button>
            </div>
            {klausur.themen.length === 0 && (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 30, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                Noch keine Themen. Lege das erste an.
              </div>
            )}
            <div style={{ display: "grid", gap: 12 }}>
              {klausur.themen.map((t) => {
                const pc = PRIORITY_COLORS[t.prioritaet];
                return (
                  <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ ...s.pill(pc.bg, pc.text), fontSize: 10 }}>{pc.label}</span>
                      <input
                        style={{
                          background: "transparent",
                          border: "none",
                          color: C.text,
                          fontSize: 15,
                          fontWeight: 600,
                          flex: 1,
                          outline: "none",
                        }}
                        value={t.name}
                        onChange={(e) => updateThemaField(t.id, "name", e.target.value)}
                      />
                      <button style={s.smallBtn(C.red)} onClick={() => deleteThema(t.id)}>
                        ✕
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <ThemaField
                        label="Key Points"
                        value={t.keypoints}
                        onChange={(v) => updateThemaField(t.id, "keypoints", v)}
                        color={C.purpleLight}
                      />
                      <ThemaField
                        label="Mindmap / Struktur"
                        value={t.mindmap}
                        onChange={(v) => updateThemaField(t.id, "mindmap", v)}
                        color={C.amber}
                      />
                      <ThemaField
                        label="Offene Fragen"
                        value={t.offeneFragen}
                        onChange={(v) => updateThemaField(t.id, "offeneFragen", v)}
                        color={"#F09595"}
                      />
                      <div>
                        <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
                          Priorität · Zeit
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select
                            value={t.prioritaet}
                            onChange={(e) => updateThemaField(t.id, "prioritaet", e.target.value as Prioritaet)}
                            style={{ ...s.sel, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
                          >
                            <option value="hoch">Hoch</option>
                            <option value="mittel">Mittel</option>
                            <option value="niedrig">Niedrig</option>
                          </select>
                          <input
                            style={{ ...s.inp, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
                            placeholder="z.B. 2h"
                            value={t.zeit}
                            onChange={(e) => updateThemaField(t.id, "zeit", e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === "flashcards" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            {fcLoading && (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✦</div>
                Gemini generiert Flashcards…
              </div>
            )}
            {fcError && (
              <div style={{ color: "#F09595", fontSize: 13, textAlign: "center", padding: 20 }}>
                {fcError}
                <div style={{ height: 12 }} />
                <button style={{ ...s.btnP, width: "auto", padding: "9px 24px" }} onClick={() => void generateFlashcards()}>
                  Nochmal versuchen
                </button>
              </div>
            )}
            {!fcLoading && !fcError && flashcards.length > 0 && (
              <FlashcardView cards={flashcards} onClose={() => setTab("themen")} />
            )}
            {!fcLoading && !fcError && flashcards.length === 0 && (
              <div style={{ textAlign: "center", padding: 30 }}>
                <button style={{ ...s.btnP, width: "auto", padding: "9px 28px" }} onClick={() => void generateFlashcards()}>
                  ✦ Flashcards generieren
                </button>
              </div>
            )}
          </div>
        )}

        {tab === "summary" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
            {summaryLoading && (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✦</div>
                Gemini erstellt Executive Summary…
              </div>
            )}
            {!summaryLoading && summary && (
              <div>
                {summary.split("\n").map((line, i) => {
                  if (line.startsWith("## "))
                    return (
                      <div key={i} style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight, marginTop: 16, marginBottom: 6 }}>
                        {line.slice(3)}
                      </div>
                    );
                  if (line.startsWith("# "))
                    return (
                      <div key={i} style={{ fontSize: 17, fontWeight: 700, color: C.purpleLight, marginBottom: 10 }}>
                        {line.slice(2)}
                      </div>
                    );
                  if (line.startsWith("- ") || line.startsWith("• "))
                    return (
                      <div
                        key={i}
                        style={{
                          fontSize: 13,
                          color: C.text,
                          padding: "2px 0 2px 12px",
                          lineHeight: 1.6,
                          borderLeft: `2px solid ${C.purple}44`,
                          marginBottom: 2,
                        }}
                      >
                        {line.slice(2)}
                      </div>
                    );
                  if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
                  return (
                    <div key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>
                      {line}
                    </div>
                  );
                })}
                <div style={{ marginTop: 16 }}>
                  <button style={{ ...s.btnS, width: "auto", padding: "8px 20px" }} onClick={() => void generateSummary()}>
                    🔄 Neu generieren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Panel */}
        <AiPanel
          show={aiOpen}
          onClose={() => setAiOpen(false)}
          systemPrompt={systemPrompt}
          files={klausurFiles}
          extraContext={`Klausur: ${klausur.title}`}
        />

        {/* Add Thema Modal */}
        {showAddThema && (
          <div
            style={s.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAddThema(false);
            }}
          >
            <div style={s.modalBox(440)}>
              <div style={s.modalTitle}>Thema hinzufügen</div>
              <input
                style={s.inp}
                placeholder="Thema (z.B. Ableitungen)"
                value={newThema.name}
                onChange={(e) => setNewThema({ ...newThema, name: e.target.value })}
                autoFocus
              />
              <select
                style={s.sel}
                value={newThema.prioritaet}
                onChange={(e) => setNewThema({ ...newThema, prioritaet: e.target.value as Prioritaet })}
              >
                <option value="hoch">Priorität: Hoch</option>
                <option value="mittel">Priorität: Mittel</option>
                <option value="niedrig">Priorität: Niedrig</option>
              </select>
              <input
                style={s.inp}
                placeholder="Geplante Zeit (z.B. 2h)"
                value={newThema.zeit}
                onChange={(e) => setNewThema({ ...newThema, zeit: e.target.value })}
              />
              <textarea
                style={s.ta}
                placeholder="Key Points (Stichpunkte, Formeln…)"
                value={newThema.keypoints}
                onChange={(e) => setNewThema({ ...newThema, keypoints: e.target.value })}
              />
              <button style={s.btnP} onClick={addThema}>
                Hinzufügen
              </button>
              <div style={{ height: 8 }} />
              <button style={s.btnS} onClick={() => setShowAddThema(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemaField({
  label,
  value,
  onChange,
  color,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{label}</div>
      <textarea
        style={{
          background: "#1a1a2a",
          border: `1px solid ${C.border}`,
          borderRadius: 6,
          color,
          padding: "6px 10px",
          fontSize: 11,
          width: "100%",
          minHeight: 60,
          boxSizing: "border-box",
          resize: "vertical",
          fontFamily: "inherit",
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…"
      />
    </div>
  );
}
