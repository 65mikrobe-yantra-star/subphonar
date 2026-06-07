import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { AiPanel } from "@/components/AiPanel";
import { FileUploadZone } from "@/components/FileUploadZone";
import { FlashcardView } from "@/components/FlashcardView";
import { MindmapCanvas } from "@/components/MindmapCanvas";
import { PruefungsTab } from "@/components/PruefungsTab";
import { ErklaerbaerTab } from "@/components/ErklaerbaerTab";
import { APP_NAME, C, PRIORITY_COLORS } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { formatDate } from "@/lib/helpers";
import { chat } from "@/lib/ai.functions";
import type { Flashcard, Klausur, MindmapStroke, Prioritaet, Thema } from "@/lib/types";

export const Route = createFileRoute("/klausuren/$id")({
  head: () => ({ meta: [{ title: `Klausur — ${APP_NAME}` }] }),
  component: KlausurDetail,
});

type SectionId = "dateien" | "themen" | "mindmap" | "summary" | "pruefung" | "erklaer";

const SECTIONS: { id: SectionId; label: string; icon: string; color: string }[] = [
  { id: "dateien", label: "Dateien", icon: "📎", color: C.amber },
  { id: "themen", label: "Themen", icon: "📋", color: C.purple },
  { id: "mindmap", label: "Mindmap", icon: "🗺", color: C.teal },
  { id: "summary", label: "Summary", icon: "📄", color: C.purpleLight },
  { id: "pruefung", label: "Prüfung", icon: "📝", color: "#E05A2B" },
  { id: "erklaer", label: "Erklärbär", icon: "🧑‍🏫", color: C.amber },
];

function scrollToSection(id: SectionId) {
  document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

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
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [aiFillLoading, setAiFillLoading] = useState<number | null>(null);
  const [aiFillError, setAiFillError] = useState<string | null>(null);
  const [showFlashcards, setShowFlashcards] = useState<Record<number, boolean>>({});
  const chatFn = useServerFn(chat);

  if (!klausur) {
    return (
      <div style={s.app}>
        <AppNav />
        <div style={s.main(false)}>
          <div style={{ textAlign: "center", padding: 60, color: C.textMuted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🤷</div>
            <div style={{ fontSize: 14, marginBottom: 14 }}>Klausur nicht gefunden</div>
            <Link to="/klausuren" style={{ ...s.btnP, width: "auto", padding: "9px 28px", display: "inline-block", textDecoration: "none" }}>
              ← Zur Übersicht
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const files = klausur.files ?? [];
  const themaFlashcards = klausur.themaFlashcards ?? {};

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

  const lastExam = (klausur.exams ?? [])[0];
  const recentErklaer = (klausur.erklaerungen ?? []).slice(0, 3).map((e) => `F: ${e.frage}`).join(" | ");
  const systemPrompt = `Du bist Lern-Coach für Klausur "${klausur.title}" (${klausur.fach}, ${formatDate(klausur.datum)}).
Probleme des Schülers: ${klausur.probleme || "—"}
Bisherige Lösungsansätze: ${klausur.loesungen || "—"}

THEMEN:
${klausur.themen.map((t) => `• ${t.name} [Prio:${t.prioritaet}, Zeit:${t.zeit || "?"}]
  KeyPoints: ${t.keypoints || "—"}
  Offene Fragen: ${t.offeneFragen || "—"}
  Häufige Verwechslungen: ${t.verwechslungen ?? "—"}`).join("\n")}

${klausur.summary ? `EXECUTIVE SUMMARY (bereits erstellt):\n${klausur.summary.slice(0, 800)}\n` : ""}
${lastExam ? `LETZTE PROBEKLAUSUR (${lastExam.schwierigkeit}): ${lastExam.done ? `${lastExam.gesamtpunkte}/${lastExam.maxpunkte} P. — ${lastExam.gesamtfeedback?.slice(0, 300) ?? ""}` : "noch nicht bewertet"}` : ""}
${recentErklaer ? `KÜRZLICHE ERKLÄRBÄR-FRAGEN: ${recentErklaer}` : ""}
${files.length ? `HOCHGELADENE DATEIEN: ${files.map((f) => f.name).join(", ")}` : ""}

Antworte präzise, strukturiert, auf Deutsch. Beziehe dich konkret auf die Daten oben — nutze sie, statt allgemeine Erklärungen zu geben.`;

  async function aiFillThema(t: Thema) {
    setAiFillLoading(t.id);
    setAiFillError(null);
    try {
      const prompt = `Fülle das Thema "${t.name}" professionell und konkret aus — als Lern-Coach für eine ${klausur!.fach}-Klausur.

Was schon da ist:
- Key Points: ${t.keypoints || "—"}
- Mindmap-Notiz: ${t.mindmap || "—"}
- Offene Fragen: ${t.offeneFragen || "—"}
- Verwechslungen: ${t.verwechslungen ?? "—"}

Antworte AUSSCHLIESSLICH als gültiges JSON (keine Backticks, kein Markdown):
{
  "keypoints": "5-8 präzise Key Points als Bulletliste mit '-' am Anfang jeder Zeile. Konkret, prüfungsrelevant, keine Plattitüden.",
  "offeneFragen": "3-4 typische Verständnisfragen die ein Schüler kurz vor der Klausur haben sollte (als Liste mit '-').",
  "verwechslungen": "2-3 typische Verwechslungen oder Fehler bei diesem Thema — sehr konkret, mit 'Achtung:' Markern.",
  "keywords": "5-8 zentrale Fachbegriffe komma-separiert"
}`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files, model: "google/gemini-2.5-flash" },
      });
      if (res.error) {
        setAiFillError(res.error);
        return;
      }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const p = JSON.parse(clean) as { keypoints?: string; offeneFragen?: string; verwechslungen?: string; keywords?: string };
      sync({
        ...klausur!,
        themen: klausur!.themen.map((x) =>
          x.id === t.id
            ? {
                ...x,
                keypoints: p.keywords ? `${p.keypoints ?? x.keypoints}\n\nKeywords: ${p.keywords}` : p.keypoints ?? x.keypoints,
                offeneFragen: p.offeneFragen ?? x.offeneFragen,
                verwechslungen: p.verwechslungen ?? x.verwechslungen,
              }
            : x,
        ),
      });
    } catch (e) {
      setAiFillError(e instanceof Error ? e.message : "KI-Antwort konnte nicht verarbeitet werden");
    } finally {
      setAiFillLoading(null);
    }
  }

  async function generateThemaFlashcards(t: Thema) {
    setAiFillLoading(t.id);
    try {
      const prompt = `Erstelle 8 Flashcards NUR zum Thema "${t.name}" aus Klausur "${klausur!.title}".
Basis:
- Key Points: ${t.keypoints}
- Mindmap: ${t.mindmap}
- Offene Fragen: ${t.offeneFragen}
- Typische Verwechslungen: ${t.verwechslungen ?? "-"}

Antworte NUR als JSON: {"cards":[{"question":"...","answer":"..."}]}. Mische Verständnisfragen mit "Was ist der Unterschied zwischen…"-Fragen die genau die Verwechslungen adressieren.`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files, model: "google/gemini-2.5-flash" },
      });
      if (res.error) { setAiFillError(res.error); return; }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as { cards: Flashcard[] };
      sync({ ...klausur!, themaFlashcards: { ...themaFlashcards, [t.id]: parsed.cards || [] } });
      setShowFlashcards((m) => ({ ...m, [t.id]: true }));
    } catch (e) {
      setAiFillError(e instanceof Error ? e.message : "Flashcards konnten nicht erstellt werden");
    } finally {
      setAiFillLoading(null);
    }
  }

  async function generateSummary() {
    setSummaryLoading(true);
    try {
      const prompt = `Executive Summary für "${klausur!.title}". Struktur:
# Executive Summary: ${klausur!.title}
## Kernkonzepte & Definitionen
## Wichtigste Formeln
## Zusammenhänge zwischen den Themen
## Typische Klausurfallen
## Last-Minute Checkliste (5 Punkte)
Sei präzise und prüfungsrelevant.`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files, model: "google/gemini-2.5-flash" },
      });
      sync({ ...klausur!, summary: res.error ? `⚠️ ${res.error}` : res.text });
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(aiOpen)}>
        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <Link to="/klausuren" style={{ fontSize: 12, color: C.textMuted, textDecoration: "none" }}>
            ← Klausuren
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: C.text, margin: 0 }}>{klausur.title}</h1>
            <div style={{ ...s.pill(C.purpleDim, C.purpleLight), fontSize: 12, padding: "4px 12px" }}>{klausur.fach || "—"}</div>
            {klausur.datum && (
              <div style={{ ...s.pill(C.amberDim, C.amber), fontSize: 12, padding: "4px 12px" }}>{formatDate(klausur.datum)}</div>
            )}
            <button style={{ ...s.smallBtn(C.purple), marginLeft: "auto", padding: "6px 14px", fontSize: 12 }} onClick={() => setAiOpen(!aiOpen)}>
              ✦ KI-Chat
            </button>
          </div>
        </div>

        {/* Probleme & Lösungen */}
        {(klausur.probleme || klausur.loesungen) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
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

        {/* Tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {TABS.map((t) => (
            <button key={t.id} style={s.tabBtn(tab === t.id, t.color)} onClick={() => setTab(t.id)}>
              {t.icon} {t.label}
              {t.id === "themen" && ` (${klausur.themen.length})`}
              {t.id === "dateien" && files.length > 0 && ` (${files.length})`}
              {t.id === "pruefung" && klausur.exams && klausur.exams.length > 0 && ` (${klausur.exams.length})`}
            </button>
          ))}
        </div>

        {/* THEMEN */}
        {tab === "themen" && (
          <div>
            <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <button style={{ ...s.smallBtn(C.teal), padding: "6px 14px", fontSize: 12 }} onClick={() => setShowAddThema(true)}>
                + Weiteres Thema
              </button>
              {aiFillError && (
                <div style={{ fontSize: 11, color: "#F09595", background: C.redDim, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.red}33` }}>
                  ⚠ {aiFillError}
                </div>
              )}
            </div>
            {klausur.themen.length === 0 && (
              <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 30, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
                Noch keine Themen. Lege das erste an.
              </div>
            )}
            <div style={{ display: "grid", gap: 14 }}>
              {klausur.themen.map((t) => {
                const pc = PRIORITY_COLORS[t.prioritaet];
                const fcs = themaFlashcards[t.id];
                return (
                  <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span style={{ ...s.pill(pc.bg, pc.text), fontSize: 10 }}>{pc.label}</span>
                      <input
                        style={{ background: "transparent", border: "none", color: C.text, fontSize: 15, fontWeight: 600, flex: 1, outline: "none" }}
                        value={t.name}
                        onChange={(e) => updateThemaField(t.id, "name", e.target.value)}
                      />
                      <button
                        style={{ ...s.smallBtn(C.amber), padding: "4px 10px" }}
                        onClick={() => void aiFillThema(t)}
                        disabled={aiFillLoading === t.id}
                        title="KI füllt Key Points, Fragen und Verwechslungen"
                      >
                        {aiFillLoading === t.id ? "…" : "✦ KI-Fill"}
                      </button>
                      <button style={s.smallBtn(C.red)} onClick={() => deleteThema(t.id)}>
                        ✕
                      </button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <ThemaField label="Key Points / Keywords" value={t.keypoints} onChange={(v) => updateThemaField(t.id, "keypoints", v)} color={C.purpleLight} />
                      <ThemaField label="Mindmap / Struktur" value={t.mindmap} onChange={(v) => updateThemaField(t.id, "mindmap", v)} color={C.amber} />
                      <ThemaField label="Offene Fragen" value={t.offeneFragen} onChange={(v) => updateThemaField(t.id, "offeneFragen", v)} color={"#F09595"} />
                      <ThemaField
                        label="Was verwechsle ich oft / Fehler?"
                        value={t.verwechslungen ?? ""}
                        onChange={(v) => updateThemaField(t.id, "verwechslungen", v)}
                        color={"#5DCAA5"}
                      />
                      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ flex: 1, display: "flex", gap: 6 }}>
                          <select
                            value={t.prioritaet}
                            onChange={(e) => updateThemaField(t.id, "prioritaet", e.target.value as Prioritaet)}
                            style={{ ...s.sel, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
                          >
                            <option value="hoch">Priorität: Hoch</option>
                            <option value="mittel">Priorität: Mittel</option>
                            <option value="niedrig">Priorität: Niedrig</option>
                          </select>
                          <input
                            style={{ ...s.inp, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
                            placeholder="Zeit (z.B. 2h)"
                            value={t.zeit}
                            onChange={(e) => updateThemaField(t.id, "zeit", e.target.value)}
                          />
                        </div>
                        <button
                          style={{ ...s.smallBtn(C.purpleLight), padding: "6px 14px", fontSize: 11 }}
                          onClick={() => void generateThemaFlashcards(t)}
                          disabled={aiFillLoading === t.id}
                        >
                          🎴 Flashcards zu diesem Thema
                        </button>
                      </div>
                    </div>
                    {fcs && fcs.length > 0 && (
                      <div style={{ marginTop: 12, padding: 12, background: C.surfaceHigh, borderRadius: 10, border: `1px solid ${C.border}` }}>
                        <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
                          <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            {fcs.length} Flashcards
                          </div>
                          <button
                            style={{ ...s.smallBtn(C.purple), padding: "3px 10px", fontSize: 10, marginLeft: "auto" }}
                            onClick={() => setShowFlashcards((m) => ({ ...m, [t.id]: !m[t.id] }))}
                          >
                            {showFlashcards[t.id] ? "Einklappen" : "Üben"}
                          </button>
                          <button
                            style={{ ...s.smallBtn(C.red), padding: "3px 10px", fontSize: 10 }}
                            onClick={() => {
                              if (!confirm("Flashcards löschen?")) return;
                              sync({ ...klausur, themaFlashcards: Object.fromEntries(Object.entries(themaFlashcards).filter(([k]) => k !== String(t.id))) });
                            }}
                          >
                            Karten löschen
                          </button>
                        </div>
                        {showFlashcards[t.id] && (
                          <FlashcardView cards={fcs} onClose={() => setShowFlashcards((m) => ({ ...m, [t.id]: false }))} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DATEIEN */}
        {tab === "dateien" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, marginBottom: 6 }}>📎 Lernmaterialien</div>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 14 }}>
              PDFs, Bilder, Notizen — die KI hat in allen Bereichen Zugriff darauf und nutzt sie für Flashcards, Probeklausuren und Erklärungen.
            </div>
            <FileUploadZone
              files={files}
              onAdd={(f) => sync({ ...klausur, files: [...files, ...f] })}
              onRemove={(i) => sync({ ...klausur, files: files.filter((_, j) => j !== i) })}
              label="Dateien hinzufügen"
            />
          </div>
        )}

        {/* MINDMAP */}
        {tab === "mindmap" && (
          <div style={{ background: "#fdfdf7", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2a" }}>🗺 Mindmap (handschriftlich)</div>
              <button
                style={{ ...s.smallBtn(C.purple), marginLeft: "auto", padding: "5px 12px", fontSize: 11 }}
                onClick={async () => {
                  const prompt = `Analysiere die Mindmap-Struktur (Themen: ${klausur.themen.map((t) => t.name).join(", ")}). Welche Verbindungen, Konzepte oder Fehler fehlen oder sind häufig falsch verknüpft? Gib 3-5 konkrete Verbesserungs-Hinweise.`;
                  const res = await chatFn({
                    data: { systemPrompt, messages: [{ role: "user", content: prompt }], files, model: "google/gemini-2.5-flash" },
                  });
                  alert(res.error ? `Fehler: ${res.error}` : res.text);
                }}
              >
                ✦ KI prüft Mindmap
              </button>
            </div>
            <MindmapCanvas
              strokes={klausur.mindmap ?? []}
              onChange={(strokes: MindmapStroke[]) => sync({ ...klausur, mindmap: strokes })}
              height={520}
            />
          </div>
        )}

        {/* PRÜFUNG */}
        {tab === "pruefung" && <PruefungsTab klausur={klausur} systemPrompt={systemPrompt} contextFiles={files} update={sync} />}

        {/* SUMMARY */}
        {tab === "summary" && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22 }}>
            {summaryLoading && (
              <div style={{ textAlign: "center", padding: 40, color: C.textMuted }}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>✦</div>
                Erstelle Executive Summary…
              </div>
            )}
            {!summaryLoading && !klausur.summary && (
              <div style={{ textAlign: "center", padding: 30 }}>
                <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 16 }}>
                  Noch keine Zusammenfassung. KI baut sie aus Themen + Dateien.
                </div>
                <button style={{ ...s.btnP, width: "auto", padding: "9px 28px" }} onClick={() => void generateSummary()}>
                  ✦ Executive Summary erstellen
                </button>
              </div>
            )}
            {!summaryLoading && klausur.summary && (
              <div>
                <RenderMarkdown text={klausur.summary} />
                <div style={{ marginTop: 16 }}>
                  <button style={{ ...s.btnS, width: "auto", padding: "8px 20px" }} onClick={() => void generateSummary()}>
                    🔄 Neu generieren
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ERKLÄRBÄR */}
        {tab === "erklaer" && <ErklaerbaerTab klausur={klausur} systemPrompt={systemPrompt} contextFiles={files} update={sync} />}

        {/* AI Panel */}
        <AiPanel show={aiOpen} onClose={() => setAiOpen(false)} systemPrompt={systemPrompt} files={files} extraContext={`Klausur: ${klausur.title}`} />

        {/* Add Thema Modal */}
        {showAddThema && (
          <div style={s.modal} onClick={(e) => { if (e.target === e.currentTarget) setShowAddThema(false); }}>
            <div style={s.modalBox(440)}>
              <div style={s.modalTitle}>Weiteres Thema</div>
              <input style={s.inp} placeholder="Thema (z.B. Ableitungen)" value={newThema.name} onChange={(e) => setNewThema({ ...newThema, name: e.target.value })} autoFocus />
              <select style={s.sel} value={newThema.prioritaet} onChange={(e) => setNewThema({ ...newThema, prioritaet: e.target.value as Prioritaet })}>
                <option value="hoch">Priorität: Hoch</option>
                <option value="mittel">Priorität: Mittel</option>
                <option value="niedrig">Priorität: Niedrig</option>
              </select>
              <input style={s.inp} placeholder="Geplante Zeit (z.B. 2h)" value={newThema.zeit} onChange={(e) => setNewThema({ ...newThema, zeit: e.target.value })} />
              <textarea style={s.ta} placeholder="Key Points (optional, KI kann später auffüllen)" value={newThema.keypoints} onChange={(e) => setNewThema({ ...newThema, keypoints: e.target.value })} />
              <button style={s.btnP} onClick={addThema}>Hinzufügen</button>
              <div style={{ height: 8 }} />
              <button style={s.btnS} onClick={() => setShowAddThema(false)}>Abbrechen</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ThemaField({ label, value, onChange, color }: { label: string; value: string; onChange: (v: string) => void; color: string }) {
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

function RenderMarkdown({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("## "))
          return <div key={i} style={{ fontSize: 14, fontWeight: 700, color: C.purpleLight, marginTop: 16, marginBottom: 6 }}>{line.slice(3)}</div>;
        if (line.startsWith("# "))
          return <div key={i} style={{ fontSize: 17, fontWeight: 700, color: C.purpleLight, marginBottom: 10 }}>{line.slice(2)}</div>;
        if (line.startsWith("- ") || line.startsWith("• "))
          return (
            <div key={i} style={{ fontSize: 13, color: C.text, padding: "2px 0 2px 12px", lineHeight: 1.6, borderLeft: `2px solid ${C.purple}44`, marginBottom: 2 }}>
              {line.slice(2)}
            </div>
          );
        if (!line.trim()) return <div key={i} style={{ height: 6 }} />;
        return <div key={i} style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>{line}</div>;
      })}
    </>
  );
}
