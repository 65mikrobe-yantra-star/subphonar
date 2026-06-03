import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AppNav } from "@/components/AppNav";
import { APP_NAME, C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { formatDate } from "@/lib/helpers";
import type { Klausur } from "@/lib/types";

export const Route = createFileRoute("/klausuren")({
  head: () => ({
    meta: [
      { title: `Klausuren — ${APP_NAME}` },
      { name: "description", content: "Plane Klausuren, sammle Themen und übe mit KI-generierten Probeklausuren und Flashcards." },
    ],
  }),
  component: KlausurenPage,
});

function KlausurenPage() {
  const [klausuren, setKlausuren] = useLocalStorage<Klausur[]>("sub.klausuren", []);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Omit<Klausur, "id" | "themen">>({
    title: "",
    fach: "",
    datum: "",
    probleme: "",
    loesungen: "",
  });

  function create() {
    if (!draft.title.trim()) return;
    const k: Klausur = { id: Date.now(), ...draft, themen: [] };
    setKlausuren([k, ...klausuren]);
    setDraft({ title: "", fach: "", datum: "", probleme: "", loesungen: "" });
    setShowNew(false);
  }
  function remove(id: number) {
    if (!confirm("Klausur wirklich löschen?")) return;
    setKlausuren(klausuren.filter((k) => k.id !== id));
  }

  const sorted = [...klausuren].sort((a, b) => {
    if (!a.datum) return 1;
    if (!b.datum) return -1;
    return new Date(a.datum).getTime() - new Date(b.datum).getTime();
  });

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(false)}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={s.sectionTitle}>📚 Klausuren</div>
          <button style={{ ...s.smallBtn(C.purple), padding: "6px 14px", fontSize: 12, marginLeft: "auto" }} onClick={() => setShowNew(true)}>
            + Neue Klausur
          </button>
        </div>

        {sorted.length === 0 && (
          <div
            style={{
              background: C.surface,
              border: `1px dashed ${C.border}`,
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
              color: C.textMuted,
            }}
          >
            <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
            <div style={{ fontSize: 14, marginBottom: 14 }}>Noch keine Klausuren angelegt</div>
            <button style={{ ...s.btnP, width: "auto", padding: "9px 28px" }} onClick={() => setShowNew(true)}>
              + Erste Klausur erstellen
            </button>
          </div>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {sorted.map((k) => {
            const daysLeft = k.datum ? Math.ceil((new Date(k.datum).getTime() - Date.now()) / 86400000) : null;
            const urgent = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
            return (
              <div
                key={k.id}
                style={{
                  background: C.surface,
                  border: `1px solid ${urgent ? C.amber + "55" : C.border}`,
                  borderRadius: 12,
                  padding: "16px 20px",
                  display: "flex",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                {daysLeft != null && (
                  <div
                    style={{
                      background: daysLeft < 0 ? C.surfaceHigh : daysLeft <= 3 ? C.redDim : daysLeft <= 7 ? C.amberDim : C.purpleDim,
                      color: daysLeft < 0 ? C.textDim : daysLeft <= 3 ? "#F09595" : daysLeft <= 7 ? C.amber : C.purpleLight,
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      minWidth: 70,
                      textAlign: "center",
                    }}
                  >
                    {daysLeft < 0 ? "vorbei" : daysLeft === 0 ? "HEUTE" : `T-${daysLeft}`}
                  </div>
                )}
                <Link
                  to="/klausuren/$id"
                  params={{ id: String(k.id) }}
                  style={{ flex: 1, textDecoration: "none", color: C.text }}
                >
                  <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 3 }}>{k.title}</div>
                  <div style={{ fontSize: 11, color: C.textMuted }}>
                    {k.fach || "Kein Fach"} {k.datum && `· ${formatDate(k.datum)}`} · {k.themen.length} Themen
                  </div>
                </Link>
                <button style={s.smallBtn(C.red)} onClick={() => remove(k.id)}>
                  ✕
                </button>
              </div>
            );
          })}
        </div>

        {showNew && (
          <div
            style={s.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNew(false);
            }}
          >
            <div style={s.modalBox(440)}>
              <div style={s.modalTitle}>Neue Klausur</div>
              <input
                style={s.inp}
                placeholder="Titel (z.B. Mathe-Klausur Analysis)"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                autoFocus
              />
              <input
                style={s.inp}
                placeholder="Fach"
                value={draft.fach}
                onChange={(e) => setDraft({ ...draft, fach: e.target.value })}
              />
              <input
                style={s.inp}
                type="date"
                value={draft.datum}
                onChange={(e) => setDraft({ ...draft, datum: e.target.value })}
              />
              <textarea
                style={s.ta}
                placeholder="Wo hakt's? Schwachstellen, offene Fragen…"
                value={draft.probleme}
                onChange={(e) => setDraft({ ...draft, probleme: e.target.value })}
              />
              <textarea
                style={s.ta}
                placeholder="Lösungsansätze, Strategien, Ressourcen…"
                value={draft.loesungen}
                onChange={(e) => setDraft({ ...draft, loesungen: e.target.value })}
              />
              <button style={s.btnP} onClick={create}>
                Klausur anlegen
              </button>
              <div style={{ height: 8 }} />
              <button style={s.btnS} onClick={() => setShowNew(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
