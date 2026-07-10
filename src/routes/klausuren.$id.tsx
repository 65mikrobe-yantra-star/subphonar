import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { AiPanel, getChatSummary, type AiTool } from "@/components/AiPanel";
import { FileUploadZone } from "@/components/FileUploadZone";
import { FlashcardView } from "@/components/FlashcardView";
import { MindmapCanvas } from "@/components/MindmapCanvas";
import { PruefungsTab } from "@/components/PruefungsTab";
import { ErklaerbaerTab } from "@/components/ErklaerbaerTab";
import { APP_NAME, C, PERSONA_PREFIX, PRIORITY_COLORS, THEMA_STATUS_COLUMNS, TYP_LABELS } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { formatDate } from "@/lib/helpers";
import { chat } from "@/lib/ai.functions";
import type { AufgabenTyp, Flashcard, Klausur, Lernstatus, MindmapStroke, Prioritaet, Thema } from "@/lib/types";

export const Route = createFileRoute("/klausuren/$id")({
  head: () => ({ meta: [{ title: `Klausur — ${APP_NAME}` }] }),
  component: KlausurDetail,
});

type SectionId = "dateien" | "themen" | "mindmap" | "summary" | "flashcards" | "pruefung" | "erklaer" | "fehler";

const SECTIONS: { id: SectionId; label: string; icon: string; color: string }[] = [
  { id: "dateien", label: "Dateien", icon: "📎", color: C.amber },
  { id: "themen", label: "Themen", icon: "📋", color: C.purple },
  { id: "mindmap", label: "Mindmap", icon: "🗺", color: C.teal },
  { id: "summary", label: "Summary", icon: "📄", color: C.purpleLight },
  { id: "flashcards", label: "Flashcards", icon: "🎴", color: C.purpleLight },
  { id: "pruefung", label: "Prüfung", icon: "📝", color: "#E05A2B" },
  { id: "erklaer", label: "Erklärbär", icon: "🧑‍🏫", color: C.amber },
  { id: "fehler", label: "Fehler-Journal", icon: "🧠", color: "#F09595" },
];

function scrollToSection(id: SectionId) {
  document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function KlausurDetail() {
  const { id } = Route.useParams();
  const [klausuren, setKlausuren] = useLocalStorage<Klausur[]>("sub.klausuren", []);
  const klausur = useMemo(() => klausuren.find((k) => String(k.id) === id), [klausuren, id]);

  const [, setTab] = useState<SectionId>("themen");
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
  const [showAllCards, setShowAllCards] = useState(false);
  const [allCardsLoading, setAllCardsLoading] = useState(false);
  const [fehlerInput, setFehlerInput] = useState("");
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
    setKlausuren((prev) => prev.map((k) => (k.id === updated.id ? updated : k)));
  }
  /** Funktionale Mutation der aktuellen Klausur — safe für sequentielle KI-Tool-Aufrufe. */
  function mutate(fn: (k: Klausur) => Klausur) {
    setKlausuren((prev) => prev.map((k) => (String(k.id) === id ? fn(k) : k)));
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
  const systemPrompt = `${PERSONA_PREFIX}
Du bist Johannas Lern-Coach für Klausur "${klausur.title}" (${klausur.fach}, ${formatDate(klausur.datum)}).
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
${(klausur.fehler ?? []).length ? `FEHLER-JOURNAL (was Johanna oft falsch macht / merken will):\n${(klausur.fehler ?? []).slice(0, 8).map((f) => `• ${f.text}`).join("\n")}` : ""}
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

  async function generateAllFlashcards() {
    setAllCardsLoading(true);
    setAiFillError(null);
    try {
      const themenText = klausur!.themen
        .map((t) => `• ${t.name} [Prio:${t.prioritaet}]\n  KeyPoints: ${t.keypoints || "—"}\n  Verwechslungen: ${t.verwechslungen ?? "—"}\n  Offene Fragen: ${t.offeneFragen || "—"}`)
        .join("\n");
      const prompt = `Erstelle 15-20 Flashcards für die GANZE Klausur "${klausur!.title}" (${klausur!.fach}).
Decke ALLE Themen ab, gewichte nach Priorität (mehr Karten für hoch).

THEMEN:
${themenText}

${klausur!.summary ? `KONTEXT-SUMMARY:\n${klausur!.summary.slice(0, 1500)}` : ""}
${(klausur!.fehler ?? []).length ? `BEKANNTE FEHLER (unbedingt Karten dazu):\n${(klausur!.fehler ?? []).map((f) => `- ${f.text}`).join("\n")}` : ""}

Mische: Definitionen, "Was ist der Unterschied…", typische Klausurfragen, und gezielte Karten zu Verwechslungen/Fehlern.
Antworte AUSSCHLIESSLICH als JSON: {"cards":[{"question":"...","answer":"..."}]}`;
      const res = await chatFn({
        data: { systemPrompt, messages: [{ role: "user", content: prompt }], files, model: "google/gemini-2.5-flash" },
      });
      if (res.error) { setAiFillError(res.error); return; }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as { cards: Flashcard[] };
      sync({ ...klausur!, flashcards: parsed.cards || [] });
      setShowAllCards(true);
    } catch (e) {
      setAiFillError(e instanceof Error ? e.message : "Flashcards konnten nicht erstellt werden");
    } finally {
      setAllCardsLoading(false);
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
          <Link to="/klausuren" style={{ fontSize: 12, color: C.textMutedOnDark, textDecoration: "none" }}>
            ← Klausuren
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 30, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: "-0.02em", fontFamily: "'Fraunces', serif" }}>{klausur.title}</h1>
            <div style={{ ...s.pill(C.purpleDim, C.purpleLight), fontSize: 12, padding: "4px 12px" }}>{klausur.fach || "—"}</div>
            {klausur.datum && (
              <div style={{ ...s.pill(C.amberDim, C.amber), fontSize: 12, padding: "4px 12px" }}>{formatDate(klausur.datum)}</div>
            )}
            <button style={{ ...s.smallBtn(C.purple), marginLeft: "auto", padding: "6px 14px", fontSize: 12 }} onClick={() => setAiOpen(!aiOpen)}>
              ✦ KI-Chat
            </button>
          </div>
          {!aiOpen && (() => {
            const summary = getChatSummary(`sub.chat.klausur.${klausur.id}`);
            if (!summary) return null;
            return (
              <button
                onClick={() => setAiOpen(true)}
                style={{
                  marginTop: 10,
                  width: "100%",
                  textAlign: "left",
                  background: "rgba(124,107,255,0.14)",
                  border: `1px solid ${C.purple}55`,
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: C.textMutedOnDark,
                  fontSize: 11.5,
                  cursor: "pointer",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-start",
                }}
                title="Chat fortsetzen"
              >
                <span style={{ color: C.purpleLight, fontWeight: 700, flexShrink: 0 }}>✦ Zuletzt:</span>
                <span style={{ flex: 1 }}>{summary}</span>
                <span style={{ color: C.textDimOnDark, flexShrink: 0 }}>↗</span>
              </button>
            );
          })()}
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

        {/* Sprung-Nav (Anker) */}
        <div style={{ position: "sticky", top: 0, zIndex: 5, background: C.bg, padding: "8px 0", marginBottom: 14, display: "flex", gap: 6, flexWrap: "wrap", borderBottom: `1px solid ${C.border}` }}>
          {SECTIONS.map((t) => (
            <button key={t.id} style={s.tabBtn(false, t.color)} onClick={() => scrollToSection(t.id)}>
              {t.icon} {t.label}
              {t.id === "themen" && ` (${klausur.themen.length})`}
              {t.id === "dateien" && files.length > 0 && ` (${files.length})`}
              {t.id === "pruefung" && klausur.exams && klausur.exams.length > 0 && ` (${klausur.exams.length})`}
            </button>
          ))}
        </div>

        {/* THEMEN */}
        <div id="sec-themen" style={{ scrollMarginTop: 70, marginBottom: 32 }}>
          <SectionTitle icon="📋" label="Themen-Board" color={C.purple} />
          {/* setTab kept to silence unused */}
          <button style={{ display: "none" }} onClick={() => setTab("themen")}>x</button>
          <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ fontSize: 12, color: C.textMuted }}>
              {klausur.themen.length} Thema{klausur.themen.length === 1 ? "" : "en"} · Ziehe per Status durch die Lernphasen.
            </div>
            <button style={{ ...s.smallBtn(C.teal), padding: "6px 14px", fontSize: 12, marginLeft: "auto" }} onClick={() => setShowAddThema(true)}>
              + Thema
            </button>
            {aiFillError && (
              <div style={{ fontSize: 11, color: "#F09595", background: C.redDim, padding: "5px 10px", borderRadius: 6, border: `1px solid ${C.red}33` }}>
                ⚠ {aiFillError}
              </div>
            )}
          </div>
          {klausur.themen.length === 0 && (
            <div style={{ background: C.surface, border: `1px dashed ${C.border}`, borderRadius: 12, padding: 40, textAlign: "center", color: C.textMuted, fontSize: 13 }}>
              Noch keine Themen. Lege das erste an.
            </div>
          )}
          {klausur.themen.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              {THEMA_STATUS_COLUMNS.map((col) => {
                const list = klausur.themen.filter((t) => (t.lernstatus ?? "offen") === col.id);
                return (
                  <div
                    key={col.id}
                    style={{
                      background: C.surface,
                      border: `1px solid ${col.color}22`,
                      borderRadius: 14,
                      padding: 14,
                      minHeight: 220,
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: `1px solid ${col.color}22` }}>
                      <span style={{ color: col.color, fontSize: 14 }}>{col.icon}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: col.color, letterSpacing: "-0.01em", flex: 1 }}>{col.label}</span>
                      <span style={{ fontSize: 11, color: C.textDim, background: col.color + "18", padding: "1px 8px", borderRadius: 99 }}>{list.length}</span>
                    </div>
                    {list.length === 0 && (
                      <div style={{ fontSize: 11, color: C.textDim, textAlign: "center", padding: 14, fontStyle: "italic" }}>{col.hint}</div>
                    )}
                    {list.map((t) => (
                      <ThemaCard
                        key={t.id}
                        thema={t}
                        expanded={!!showFlashcards[`exp-${t.id}` as unknown as number]}
                        onToggle={() => setShowFlashcards((m) => ({ ...m, [`exp-${t.id}` as unknown as number]: !m[`exp-${t.id}` as unknown as number] }))}
                        onUpdate={(field, val) => updateThemaField(t.id, field, val)}
                        onDelete={() => deleteThema(t.id)}
                        onAiFill={() => void aiFillThema(t)}
                        onGenerateCards={() => void generateThemaFlashcards(t)}
                        aiLoading={aiFillLoading === t.id}
                        flashcards={themaFlashcards[t.id]}
                        showFlashcards={!!showFlashcards[t.id]}
                        toggleFlashcards={() => setShowFlashcards((m) => ({ ...m, [t.id]: !m[t.id] }))}
                        deleteFlashcards={() => {
                          if (!confirm("Flashcards löschen?")) return;
                          sync({ ...klausur, themaFlashcards: Object.fromEntries(Object.entries(themaFlashcards).filter(([k]) => k !== String(t.id))) });
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>


        {/* DATEIEN */}
        <div id="sec-dateien" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
        <SectionTitle icon="📎" label="Dateien & Lernmaterialien" color={C.amber} />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
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
        </div>

        {/* MINDMAP */}
        <div id="sec-mindmap" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
        <SectionTitle icon="🗺" label="Themen-Mindmap" color={C.teal} />
          <div style={{ background: "#fdfdf7", border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: "#1a1a2a" }}>Skizze, Konzept-Verbindungen…</div>
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
              height={640}
            />
          </div>
        </div>

        {/* SUMMARY */}
        <div id="sec-summary" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
        <SectionTitle icon="📄" label="Executive Summary" color={C.purpleLight} />
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
        </div>

        {/* FLASHCARDS (ganze Klausur) */}
        <div id="sec-flashcards" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
          <SectionTitle icon="🎴" label="Flashcards — ganze Klausur" color={C.purpleLight} />
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>
              KI erstellt 15–20 Karten quer über alle Themen, inkl. deiner Fehler aus dem Journal.
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              <button
                style={{ ...s.btnP, width: "auto", padding: "8px 22px" }}
                onClick={() => void generateAllFlashcards()}
                disabled={allCardsLoading || klausur.themen.length === 0}
              >
                {allCardsLoading ? "…" : (klausur.flashcards?.length ? "🔄 Neu generieren" : "✦ KI-Flashcards erstellen")}
              </button>
              {klausur.flashcards && klausur.flashcards.length > 0 && (
                <>
                  <button
                    style={{ ...s.smallBtn(C.purple), padding: "8px 16px", fontSize: 12 }}
                    onClick={() => setShowAllCards((v) => !v)}
                  >
                    {showAllCards ? "Einklappen" : `Üben (${klausur.flashcards.length})`}
                  </button>
                  <button
                    style={{ ...s.smallBtn(C.red), padding: "8px 16px", fontSize: 12 }}
                    onClick={() => {
                      if (!confirm("Alle Klausur-Flashcards löschen?")) return;
                      sync({ ...klausur, flashcards: [] });
                    }}
                  >
                    Löschen
                  </button>
                </>
              )}
            </div>
            {klausur.themen.length === 0 && (
              <div style={{ fontSize: 12, color: C.textDim, fontStyle: "italic" }}>Zuerst Themen anlegen.</div>
            )}
            {klausur.flashcards && klausur.flashcards.length > 0 && showAllCards && (
              <FlashcardView cards={klausur.flashcards} onClose={() => setShowAllCards(false)} />
            )}
          </div>
        </div>

        {/* PRÜFUNG */}
        <div id="sec-pruefung" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
        <SectionTitle icon="📝" label="Probeklausur" color={"#E05A2B"} />
        <PruefungsTab klausur={klausur} systemPrompt={systemPrompt} contextFiles={files} update={sync} />
        </div>

        {/* ERKLÄRBÄR */}
        <div id="sec-erklaer" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
        <SectionTitle icon="🧑‍🏫" label="Erklärbär" color={C.amber} />
        <ErklaerbaerTab klausur={klausur} systemPrompt={systemPrompt} contextFiles={files} update={sync} />
        </div>

        {/* FEHLER-JOURNAL — spielerisch & motivierend */}
        <div id="sec-fehler" style={{ scrollMarginTop: 70, marginBottom: 28 }}>
          <SectionTitle icon="🧠" label="Aha-Momente & Stolperfallen" color={"#F09595"} />
          {(() => {
            const fehlerList = klausur.fehler ?? [];
            const emojis = ["💡", "🎯", "⚡", "🔍", "🧩", "🚀", "🌟", "🦉", "🧠", "🎓"];
            const cardTints = [
              { bg: "linear-gradient(135deg,#FFE7B8 0%,#FFD68A 100%)", ink: "#7A4B00", accent: "#E88E00" },
              { bg: "linear-gradient(135deg,#D7F0FF 0%,#A6DAFF 100%)", ink: "#0B4A73", accent: "#0F80C2" },
              { bg: "linear-gradient(135deg,#FFD9E6 0%,#FFB1CD 100%)", ink: "#7A0E3E", accent: "#D93B7A" },
              { bg: "linear-gradient(135deg,#D8F5D6 0%,#A6E7A2 100%)", ink: "#0F4D18", accent: "#2AA13B" },
              { bg: "linear-gradient(135deg,#E5DDFF 0%,#C4B4FF 100%)", ink: "#2E1A7A", accent: "#5A3EEA" },
            ];
            const cheers = [
              "Aufgeschrieben ist halb gemerkt! 💪",
              "Ein Fehler weniger fürs nächste Mal ✨",
              "Diese Falle kennt Subby jetzt für dich 🐉",
              "Klein festgehalten, groß gelernt 🌱",
              "Boom — im Kopf abgespeichert 🎯",
            ];
            return (
              <div
                style={{
                  background: "linear-gradient(160deg, rgba(249,196,132,0.08) 0%, rgba(240,149,149,0.06) 100%)",
                  border: `1px solid rgba(240,149,149,0.25)`,
                  borderRadius: 20,
                  padding: 20,
                }}
              >
                {/* Header-Zeile mit Zähler */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                  <div
                    style={{
                      background: "linear-gradient(135deg,#F9C484,#F09595)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "5px 12px",
                      borderRadius: 99,
                      display: "inline-flex",
                      gap: 6,
                      alignItems: "center",
                      boxShadow: "0 4px 12px -4px rgba(240,149,149,0.5)",
                    }}
                  >
                    🎒 {fehlerList.length} {fehlerList.length === 1 ? "Aha-Moment" : "Aha-Momente"}
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, flex: 1 }}>
                    Was hat dich reingelegt? Was willst du merken? Subby liest mit und hilft im nächsten Chat.
                  </div>
                </div>

                {/* Input-Karte */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px dashed rgba(240,149,149,0.35)`,
                    borderRadius: 14,
                    padding: 14,
                    marginBottom: 18,
                  }}
                >
                  <textarea
                    style={{ ...s.ta, minHeight: 62, marginBottom: 8, fontSize: 13 }}
                    placeholder={'💭 z.B. „Beim Ableiten von x·sin(x) an die Produktregel denken!" oder „Comma-Splice in Englisch-Aufsatz"'}
                    value={fehlerInput}
                    onChange={(e) => setFehlerInput(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <button
                      style={{
                        background: "linear-gradient(135deg,#F9C484,#F09595)",
                        color: "#fff",
                        border: "none",
                        borderRadius: 10,
                        padding: "9px 20px",
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 14px -4px rgba(240,149,149,0.6)",
                      }}
                      onClick={() => {
                        const txt = fehlerInput.trim();
                        if (!txt) return;
                        const entry = { id: Date.now(), date: new Date().toISOString(), text: txt };
                        mutate((k) => ({ ...k, fehler: [entry, ...(k.fehler ?? [])] }));
                        setFehlerInput("");
                      }}
                    >
                      ✨ Merken!
                    </button>
                    <div style={{ fontSize: 11, color: C.textDim }}>
                      💡 Tipp: Frag Subby einfach im Chat „trag ins Fehlerprotokoll ein: …"
                    </div>
                  </div>
                </div>

                {/* Empty State — freundlich */}
                {fehlerList.length === 0 && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "24px 16px",
                      background: "rgba(255,255,255,0.02)",
                      borderRadius: 14,
                      border: `1px solid rgba(255,255,255,0.05)`,
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 8 }}>🌱</div>
                    <div style={{ fontSize: 14, color: C.text, fontWeight: 600, marginBottom: 4 }}>
                      Noch leer — und das ist ok!
                    </div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>
                      Sobald du beim Üben stolperst, hier festhalten. Jeder Eintrag = ein Bonus im nächsten Test.
                    </div>
                  </div>
                )}

                {/* Karten-Grid */}
                {fehlerList.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
                    {fehlerList.map((f, i) => {
                      const tint = cardTints[i % cardTints.length];
                      const emoji = emojis[i % emojis.length];
                      const cheer = cheers[i % cheers.length];
                      return (
                        <div
                          key={f.id}
                          style={{
                            background: tint.bg,
                            borderRadius: 18,
                            padding: 16,
                            position: "relative",
                            boxShadow: "0 6px 18px -8px rgba(0,0,0,0.35)",
                            transform: `rotate(${(i % 3) - 1}deg)`,
                            transition: "transform 200ms ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.transform = "rotate(0deg) translateY(-2px)")}
                          onMouseLeave={(e) => (e.currentTarget.style.transform = `rotate(${(i % 3) - 1}deg)`)}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 18,
                                boxShadow: "inset 0 -2px 4px rgba(0,0,0,0.08)",
                              }}
                            >
                              {emoji}
                            </div>
                            <div style={{ fontSize: 10, color: tint.ink, opacity: 0.7, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                              {formatDate(f.date)}
                            </div>
                            <button
                              style={{
                                marginLeft: "auto",
                                background: "rgba(255,255,255,0.5)",
                                border: "none",
                                color: tint.ink,
                                borderRadius: 8,
                                width: 24,
                                height: 24,
                                fontSize: 12,
                                cursor: "pointer",
                                opacity: 0.6,
                              }}
                              onClick={() => mutate((k) => ({ ...k, fehler: (k.fehler ?? []).filter((x) => x.id !== f.id) }))}
                              title="Löschen"
                            >
                              ✕
                            </button>
                          </div>
                          <div style={{ fontSize: 13.5, color: tint.ink, whiteSpace: "pre-wrap", lineHeight: 1.5, fontWeight: 500, marginBottom: 10 }}>
                            {f.text}
                          </div>
                          <div
                            style={{
                              fontSize: 10.5,
                              color: tint.accent,
                              fontWeight: 700,
                              background: "rgba(255,255,255,0.55)",
                              padding: "4px 10px",
                              borderRadius: 99,
                              display: "inline-block",
                            }}
                          >
                            {cheer}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>


        {/* AI Panel mit Tool-Layer — die KI kann Themen & Fehler direkt anlegen/löschen */}
        {(() => {
          const aiTools: AiTool[] = [
            {
              name: "add_thema",
              description: `Legt ein neues (Unter-)Thema an. Payload: {"name":"...", "prioritaet":"hoch|mittel|niedrig", "zeit":"z.B. 2h", "keypoints":"- ...\\n- ...", "offeneFragen":"- ...", "verwechslungen":"- ...", "typ":"theorie|rechnung|freitext|mc|vokabeln|anwendung"}`,
              run: (p) => {
                const d = p as Partial<Thema> & { name: string };
                const neu: Thema = {
                  id: Date.now() + Math.floor(Math.random() * 1000),
                  name: d.name,
                  prioritaet: (d.prioritaet as Prioritaet) ?? "mittel",
                  zeit: d.zeit ?? "",
                  keypoints: d.keypoints ?? "",
                  mindmap: d.mindmap ?? "",
                  offeneFragen: d.offeneFragen ?? "",
                  verwechslungen: d.verwechslungen,
                  typ: d.typ as AufgabenTyp | undefined,
                  relevanz: d.relevanz,
                  lernstatus: "offen",
                };
                mutate((k) => ({ ...k, themen: [...k.themen, neu] }));
                return `Thema angelegt: „${neu.name}"`;
              },
            },
            {
              name: "delete_thema",
              description: `Löscht ein Thema per Name. Payload: {"name":"exakter Themenname"}`,
              run: (p) => {
                const d = p as { name: string };
                mutate((k) => ({ ...k, themen: k.themen.filter((t) => t.name !== d.name) }));
                return `Thema gelöscht: „${d.name}"`;
              },
            },
            {
              name: "add_fehler",
              description: `Trägt einen Eintrag ins Fehler-Journal ein. Payload: {"text":"kurze Beschreibung was schief lief / was zu merken ist"}`,
              run: (p) => {
                const d = p as { text: string };
                const entry = { id: Date.now() + Math.floor(Math.random() * 1000), date: new Date().toISOString(), text: d.text };
                mutate((k) => ({ ...k, fehler: [entry, ...(k.fehler ?? [])] }));
                return `Ins Fehler-Journal eingetragen 🧠`;
              },
            },
            {
              name: "delete_fehler",
              description: `Löscht einen Fehler-Eintrag per Textmatch. Payload: {"contains":"Teilstring des Eintrags"}`,
              run: (p) => {
                const d = p as { contains: string };
                mutate((k) => ({ ...k, fehler: (k.fehler ?? []).filter((f) => !f.text.includes(d.contains)) }));
                return `Fehler-Einträge mit „${d.contains}" gelöscht`;
              },
            },
            {
              name: "update_probleme",
              description: `Setzt/ergänzt das "Wo's hakt"-Feld der Klausur. Payload: {"text":"...", "mode":"append|replace"}`,
              run: (p) => {
                const d = p as { text: string; mode?: "append" | "replace" };
                mutate((k) => ({ ...k, probleme: d.mode === "replace" ? d.text : `${k.probleme ? k.probleme + "\n" : ""}${d.text}` }));
                return `Probleme aktualisiert`;
              },
            },
          ];
          return (
            <AiPanel
              show={aiOpen}
              onClose={() => setAiOpen(false)}
              systemPrompt={systemPrompt}
              files={files}
              extraContext={`Klausur: ${klausur.title} · Tools aktiv`}
              storageKey={`sub.chat.klausur.${klausur.id}`}
              tools={aiTools}
            />
          );
        })()}


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

function SectionTitle({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <div style={{ width: 4, height: 20, background: color, borderRadius: 2 }} />
      <div style={{ fontSize: 17, fontWeight: 700, color: C.text, letterSpacing: "-0.02em" }}>
        <span style={{ marginRight: 6, opacity: 0.85 }}>{icon}</span>{label}
      </div>
    </div>
  );
}

type ThemaCardProps = {
  thema: Thema;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: <K extends keyof Thema>(field: K, val: Thema[K]) => void;
  onDelete: () => void;
  onAiFill: () => void;
  onGenerateCards: () => void;
  aiLoading: boolean;
  flashcards?: Flashcard[];
  showFlashcards: boolean;
  toggleFlashcards: () => void;
  deleteFlashcards: () => void;
};

function ThemaCard({ thema: t, expanded, onToggle, onUpdate, onDelete, onAiFill, onGenerateCards, aiLoading, flashcards, showFlashcards, toggleFlashcards, deleteFlashcards }: ThemaCardProps) {
  const pc = PRIORITY_COLORS[t.prioritaet];
  const typ = TYP_LABELS[t.typ ?? "theorie"];
  const relevanz = t.relevanz ?? (t.prioritaet === "hoch" ? 5 : t.prioritaet === "mittel" ? 3 : 2);
  return (
    <div
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
        backdropFilter: "blur(10px)",
        border: `1px solid rgba(255,255,255,0.08)`,
        borderRadius: 16,
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 20px -8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)",
        transition: "transform 150ms ease, border-color 150ms ease, box-shadow 150ms ease",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <input
          style={{ background: "transparent", border: "none", color: C.text, fontSize: 15, fontWeight: 700, flex: 1, outline: "none", padding: 0, letterSpacing: "-0.015em", lineHeight: 1.3 }}
          value={t.name}
          onChange={(e) => onUpdate("name", e.target.value)}
        />
        <button
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: C.textMuted, cursor: "pointer", fontSize: 11, padding: "4px 10px", borderRadius: 8 }}
          onClick={onToggle}
          title={expanded ? "Einklappen" : "Details"}
        >
          {expanded ? "▴ weniger" : "▾ mehr"}
        </button>
      </div>

      {/* Badge-Zeile */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <span style={{ background: typ.color + "1a", color: typ.color, fontSize: 10.5, padding: "3px 10px", borderRadius: 99, fontWeight: 600, border: `1px solid ${typ.color}33` }}>
          {typ.icon} {typ.label}
        </span>
        <span style={{ background: pc.bg + "1a", color: pc.bg, fontSize: 10.5, padding: "3px 10px", borderRadius: 99, fontWeight: 600, border: `1px solid ${pc.bg}33` }}>
          ● {pc.label}
        </span>
        {t.zeit && (
          <span style={{ background: "rgba(255,255,255,0.04)", color: C.textMuted, fontSize: 10.5, padding: "3px 10px", borderRadius: 99, border: `1px solid rgba(255,255,255,0.08)` }}>
            ⏱ {t.zeit}
          </span>
        )}
      </div>

      {/* Relevanz — dünner Gradient-Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 9.5, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>Relevanz</span>
        <div
          style={{
            flex: 1,
            height: 6,
            borderRadius: 99,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            position: "relative",
            cursor: "pointer",
          }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const v = Math.max(1, Math.min(5, Math.round(((e.clientX - r.left) / r.width) * 5)));
            onUpdate("relevanz", v);
          }}
          title="Klicken zum Setzen"
        >
          <div
            style={{
              width: `${(relevanz / 5) * 100}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${pc.bg}, ${pc.bg}dd)`,
              borderRadius: 99,
              transition: "width 200ms ease",
              boxShadow: `0 0 8px ${pc.bg}66`,
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: pc.bg, fontWeight: 700, minWidth: 24, textAlign: "right" }}>{relevanz}/5</span>
      </div>

      {/* Lernstatus — segmentierte Pill-Row */}
      <div
        style={{
          display: "flex",
          background: "rgba(255,255,255,0.04)",
          borderRadius: 10,
          padding: 3,
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {(["offen", "lernend", "sitzt"] as Lernstatus[]).map((st) => {
          const active = (t.lernstatus ?? "offen") === st;
          const color = st === "offen" ? C.purple : st === "lernend" ? C.amber : C.teal;
          const label = st === "offen" ? "Offen" : st === "lernend" ? "Am Lernen" : "Sitzt";
          return (
            <button
              key={st}
              onClick={() => onUpdate("lernstatus", st)}
              style={{
                flex: 1,
                background: active ? color + "22" : "transparent",
                border: active ? `1px solid ${color}55` : "1px solid transparent",
                color: active ? color : C.textMuted,
                borderRadius: 8,
                padding: "5px 6px",
                fontSize: 11,
                cursor: "pointer",
                fontWeight: active ? 700 : 500,
                transition: "all 150ms ease",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ display: "grid", gap: 10, paddingTop: 10, borderTop: `1px solid rgba(255,255,255,0.06)` }}>
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={t.typ ?? "theorie"}
              onChange={(e) => onUpdate("typ", e.target.value as AufgabenTyp)}
              style={{ ...s.sel, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
            >
              {Object.entries(TYP_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              value={t.prioritaet}
              onChange={(e) => onUpdate("prioritaet", e.target.value as Prioritaet)}
              style={{ ...s.sel, marginBottom: 0, padding: "5px 8px", fontSize: 11, flex: 1 }}
            >
              <option value="hoch">Hoch</option>
              <option value="mittel">Mittel</option>
              <option value="niedrig">Niedrig</option>
            </select>
            <input
              style={{ ...s.inp, marginBottom: 0, padding: "5px 8px", fontSize: 11, width: 70 }}
              placeholder="Zeit"
              value={t.zeit}
              onChange={(e) => onUpdate("zeit", e.target.value)}
            />
          </div>
          <ThemaField label="Key Points" value={t.keypoints} onChange={(v) => onUpdate("keypoints", v)} color={C.purpleLight} />
          <ThemaField label="Mindmap / Struktur" value={t.mindmap} onChange={(v) => onUpdate("mindmap", v)} color={C.amber} />
          <ThemaField label="Offene Fragen" value={t.offeneFragen} onChange={(v) => onUpdate("offeneFragen", v)} color={"#F09595"} />
          <ThemaField label="Verwechslungen / Fallen" value={t.verwechslungen ?? ""} onChange={(v) => onUpdate("verwechslungen", v)} color={"#5DCAA5"} />

          {/* Unified Action-Row */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
            <button
              onClick={onAiFill}
              disabled={aiLoading}
              style={{
                background: aiLoading ? "rgba(239,159,39,0.15)" : `linear-gradient(135deg, ${C.amber}, ${C.amber}dd)`,
                color: aiLoading ? C.amber : "#fff",
                border: "none",
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: aiLoading ? "wait" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                boxShadow: aiLoading ? "none" : `0 4px 12px -4px ${C.amber}88`,
              }}
            >
              {aiLoading ? "…" : "✦ KI-Fill"}
            </button>
            <button
              onClick={onGenerateCards}
              disabled={aiLoading}
              style={{
                background: "rgba(175,169,236,0.15)",
                color: C.purpleLight,
                border: `1px solid ${C.purpleLight}44`,
                borderRadius: 9,
                padding: "7px 14px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              🎴 Flashcards
            </button>
            <button
              onClick={onDelete}
              style={{
                marginLeft: "auto",
                background: "transparent",
                color: "#F09595",
                border: `1px solid ${C.red}44`,
                borderRadius: 9,
                padding: "7px 12px",
                fontSize: 11.5,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          {flashcards && flashcards.length > 0 && (
            <div style={{ padding: 12, background: "rgba(127,119,221,0.06)", borderRadius: 10, border: `1px solid ${C.purple}22` }}>
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <div style={{ fontSize: 10.5, color: C.purpleLight, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>
                  🎴 {flashcards.length} Karten
                </div>
                <button style={{ marginLeft: "auto", background: C.purple, color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 11, fontWeight: 600, cursor: "pointer" }} onClick={toggleFlashcards}>
                  {showFlashcards ? "Einklappen" : "Üben"}
                </button>
                <button style={{ background: "transparent", color: "#F09595", border: `1px solid ${C.red}44`, borderRadius: 8, padding: "5px 10px", fontSize: 11, cursor: "pointer" }} onClick={deleteFlashcards}>
                  Löschen
                </button>
              </div>
              {showFlashcards && <FlashcardView cards={flashcards} onClose={toggleFlashcards} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}




function ThemaField({ label, value, onChange, color }: { label: string; value: string; onChange: (v: string) => void; color: string }) {
  return (
    <div
      style={{
        background: color + "0f",
        borderRadius: 10,
        padding: "10px 12px 10px 14px",
        borderLeft: `3px solid ${color}`,
        border: `1px solid ${color}22`,
        borderLeftWidth: 3,
      }}
    >
      <div style={{ fontSize: 9.5, color: color, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6, fontWeight: 700, opacity: 0.85 }}>
        {label}
      </div>
      <textarea
        style={{
          background: "transparent",
          border: "none",
          color: C.text,
          padding: 0,
          fontSize: 12.5,
          width: "100%",
          minHeight: 54,
          boxSizing: "border-box",
          resize: "vertical",
          fontFamily: "inherit",
          outline: "none",
          lineHeight: 1.55,
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
