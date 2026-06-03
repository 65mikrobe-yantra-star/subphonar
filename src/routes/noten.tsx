import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppNav } from "@/components/AppNav";
import { AiPanel } from "@/components/AiPanel";
import { APP_NAME, C, FAECHER_DEFAULT } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { avg, notenFarbe, punkte2Note } from "@/lib/helpers";
import type { Fach, Mode } from "@/lib/types";

export const Route = createFileRoute("/noten")({
  head: () => ({
    meta: [
      { title: `Noten — ${APP_NAME}` },
      { name: "description", content: "Verwalte deine Noten und Punkte mit KI-gestützter Analyse." },
    ],
  }),
  component: NotenPage,
});

function NotenPage() {
  const [faecher, setFaecher] = useLocalStorage<Fach[]>("sub.faecher", FAECHER_DEFAULT);
  const [newFach, setNewFach] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [notenInput, setNotenInput] = useState<Record<number, string>>({});
  const [aiOpen, setAiOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("note");

  function addFach() {
    if (!newFach.trim()) return;
    setFaecher([...faecher, { id: Date.now(), name: newFach.trim(), noten: [], gewichtung: 1 }]);
    setNewFach("");
    setShowAdd(false);
  }
  function addNote(fachId: number) {
    const raw = (notenInput[fachId] || "").trim();
    const val = parseFloat(raw.replace(",", "."));
    if (isNaN(val)) return;
    const clamped = mode === "punkte" ? Math.min(15, Math.max(0, val)) : Math.min(6, Math.max(1, val));
    setFaecher(
      faecher.map((f) =>
        f.id === fachId
          ? { ...f, noten: [...f.noten, { val: clamped, type: mode, date: new Date().toLocaleDateString("de-DE") }] }
          : f,
      ),
    );
    setNotenInput({ ...notenInput, [fachId]: "" });
  }
  function removeNote(fachId: number, idx: number) {
    setFaecher(faecher.map((f) => (f.id === fachId ? { ...f, noten: f.noten.filter((_, i) => i !== idx) } : f)));
  }
  function deleteFach(id: number) {
    setFaecher(faecher.filter((f) => f.id !== id));
  }

  const allAvgs = useMemo(
    () =>
      faecher
        .map((f) => {
          const ns = f.noten.map((n) => (n.type === "punkte" ? punkte2Note(n.val) : n.val)).filter((x): x is number => x != null);
          return { name: f.name, avg: avg(ns), gew: f.gewichtung };
        })
        .filter((x) => x.avg != null) as { name: string; avg: number; gew: number }[],
    [faecher],
  );

  const gesamtschnitt = allAvgs.length
    ? allAvgs.reduce((sum, x) => sum + x.avg * x.gew, 0) / allAvgs.reduce((sum, x) => sum + x.gew, 0)
    : null;

  const notenContext = `Notendaten: ${faecher
    .map((f) => {
      const ns = f.noten.map((n) => (n.type === "punkte" ? `${n.val}P` : n.val)).join(", ");
      const snitt = avg(f.noten.map((n) => (n.type === "punkte" ? punkte2Note(n.val) : n.val)).filter((x): x is number => x != null));
      return `${f.name}: [${ns || "keine"}] Ø${snitt ? snitt.toFixed(2) : "?"}`;
    })
    .join(" | ")}. Gesamtdurchschnitt: ${gesamtschnitt ? gesamtschnitt.toFixed(2) : "?"}`;

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(aiOpen)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
          <div style={s.sectionTitle}>📊 Notenübersicht</div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button style={s.tabBtn(mode === "note", C.purple)} onClick={() => setMode("note")}>
              Noten (1–6)
            </button>
            <button style={s.tabBtn(mode === "punkte", C.amber)} onClick={() => setMode("punkte")}>
              Punkte (0–15)
            </button>
            <button style={{ ...s.smallBtn(C.purple), padding: "6px 14px", fontSize: 12 }} onClick={() => setAiOpen(!aiOpen)}>
              ✦ KI-Analyse
            </button>
            <button style={{ ...s.smallBtn(C.teal), padding: "6px 14px", fontSize: 12 }} onClick={() => setShowAdd(true)}>
              + Fach
            </button>
          </div>
        </div>

        {gesamtschnitt != null && (
          <div
            style={{
              background: `linear-gradient(135deg, ${notenFarbe(gesamtschnitt)}22, ${notenFarbe(gesamtschnitt)}11)`,
              border: `1px solid ${notenFarbe(gesamtschnitt)}55`,
              borderRadius: 14,
              padding: "18px 24px",
              marginBottom: 22,
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                Gesamtdurchschnitt
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: notenFarbe(gesamtschnitt) }}>{gesamtschnitt.toFixed(2)}</div>
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 6 }}>Fächer im Schnitt</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {allAvgs.map((x) => (
                  <span key={x.name} style={{ ...s.pill(notenFarbe(x.avg) + "22", notenFarbe(x.avg)), fontSize: 11 }}>
                    {x.name}: {x.avg.toFixed(1)}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: C.textMuted }}>Tendenz</div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  color: gesamtschnitt <= 2.5 ? C.teal : gesamtschnitt <= 3.5 ? C.amber : C.red,
                }}
              >
                {gesamtschnitt <= 1.5
                  ? "Sehr gut"
                  : gesamtschnitt <= 2.5
                    ? "Gut"
                    : gesamtschnitt <= 3.5
                      ? "Befriedigend"
                      : gesamtschnitt <= 4
                        ? "Ausreichend"
                        : "Gefährdet ⚠"}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {faecher.map((fach) => {
            const ns = fach.noten.map((n) => (n.type === "punkte" ? punkte2Note(n.val) : n.val)).filter((x): x is number => x != null);
            const schnitt = avg(ns);
            const farbe = schnitt != null ? notenFarbe(schnitt) : C.textDim;
            return (
              <div key={fach.id} style={{ background: C.surface, border: `1px solid ${farbe}44`, borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: farbe, flex: 1 }}>{fach.name}</span>
                  {schnitt != null && (
                    <span style={{ ...s.pill(farbe + "22", farbe), fontSize: 13, fontWeight: 700, padding: "3px 10px" }}>
                      Ø {schnitt.toFixed(2)}
                    </span>
                  )}
                  <button style={s.smallBtn(C.red)} onClick={() => deleteFach(fach.id)}>
                    ✕
                  </button>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 10, minHeight: 28 }}>
                  {fach.noten.length === 0 && <span style={{ fontSize: 11, color: C.textDim }}>Noch keine Noten</span>}
                  {fach.noten.map((n, i) => {
                    const col = notenFarbe(n.type === "punkte" ? punkte2Note(n.val) ?? 6 : n.val);
                    return (
                      <div
                        key={i}
                        style={{
                          background: col + "22",
                          border: `1px solid ${col}55`,
                          borderRadius: 99,
                          padding: "2px 10px",
                          fontSize: 12,
                          color: col,
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          cursor: "pointer",
                        }}
                        onClick={() => removeNote(fach.id, i)}
                        title="Klicken zum Entfernen"
                      >
                        {n.val}
                        {n.type === "punkte" ? "P" : ""} <span style={{ fontSize: 9, opacity: 0.6 }}>✕</span>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    style={{ ...s.inp, marginBottom: 0, flex: 1, padding: "6px 10px", fontSize: 12 }}
                    placeholder={mode === "punkte" ? "Punkte (0–15)" : "Note (1–6)"}
                    value={notenInput[fach.id] || ""}
                    onChange={(e) => setNotenInput({ ...notenInput, [fach.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addNote(fach.id);
                    }}
                    type="number"
                    min={mode === "punkte" ? 0 : 1}
                    max={mode === "punkte" ? 15 : 6}
                    step="0.1"
                  />
                  <button style={{ ...s.smallBtn(C.purple), padding: "6px 14px" }} onClick={() => addNote(fach.id)}>
                    +
                  </button>
                </div>
                {fach.noten.length > 0 && (
                  <div style={{ marginTop: 8, fontSize: 10, color: C.textDim }}>
                    Beste: {Math.min(...ns).toFixed(1)} · Schlechteste: {Math.max(...ns).toFixed(1)} · {fach.noten.length} Einträge
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <AiPanel
          show={aiOpen}
          onClose={() => setAiOpen(false)}
          systemPrompt={`Du bist ein Leistungsanalyst für Schüler. ${notenContext}. Antworte auf Deutsch. Gib konkrete, motivierende Tipps. Berechne Durchschnitte korrekt. Bayerisches System: Punkte 0–15, Note 1–6. Erkenne Schwachfächer und gib Verbesserungsstrategien.`}
          extraContext="Notenanalyse"
          actionLabel="Ich kenne deine aktuellen Noten und kann Verbesserungsstrategien geben"
        />

        {showAdd && (
          <div
            style={s.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAdd(false);
            }}
          >
            <div style={s.modalBox()}>
              <div style={s.modalTitle}>Fach hinzufügen</div>
              <input
                style={s.inp}
                placeholder="Fachname"
                value={newFach}
                onChange={(e) => setNewFach(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addFach();
                }}
                autoFocus
              />
              <button style={s.btnP} onClick={addFach}>
                Hinzufügen
              </button>
              <div style={{ height: 8 }} />
              <button style={s.btnS} onClick={() => setShowAdd(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
