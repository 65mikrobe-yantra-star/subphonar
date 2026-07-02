import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { AiPanel } from "@/components/AiPanel";
import { DailyBrief } from "@/components/DailyBrief";
import { DailyHeader } from "@/components/DailyHeader";
import { APP_NAME, C, FAECHER_DEFAULT, HARVEY_QUOTES, PERSONA_PREFIX } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { avg, formatDate, isOverdue, punkte2Note } from "@/lib/helpers";
import { chat } from "@/lib/ai.functions";
import type { Fach, Klausur, Todo } from "@/lib/types";
import harveyBg from "@/assets/harvey-bg.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} — Dein Lern-Cockpit` },
      { name: "description", content: "Subphonar ist dein KI-gestützter Lernbegleiter: Noten, Klausurvorbereitung, Flashcards und Todos." },
      { property: "og:title", content: `${APP_NAME} — Dein Lern-Cockpit` },
      { property: "og:description", content: "KI-gestützter Lernbegleiter für Schule und Studium." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const [faecher] = useLocalStorage<Fach[]>("sub.faecher", FAECHER_DEFAULT);
  const [klausuren] = useLocalStorage<Klausur[]>("sub.klausuren", []);
  const [todos, setTodos] = useLocalStorage<Todo[]>("sub.todos", []);
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [plan, setPlan] = useLocalStorage<string>("sub.dashboard.plan", "");
  const [planLoading, setPlanLoading] = useState(false);
  const chatFn = useServerFn(chat);

  useEffect(() => {
    setQuoteIdx(Math.floor(Math.random() * HARVEY_QUOTES.length));
  }, []);

  const gesamtschnitt = useMemo(() => {
    const allAvgs = faecher
      .map((f) => {
        const ns = f.noten.map((n) => (n.type === "punkte" ? punkte2Note(n.val) : n.val)).filter((x): x is number => x != null);
        return { avg: avg(ns), gew: f.gewichtung };
      })
      .filter((x) => x.avg != null) as { avg: number; gew: number }[];
    if (!allAvgs.length) return null;
    return allAvgs.reduce((sum, x) => sum + x.avg * x.gew, 0) / allAvgs.reduce((sum, x) => sum + x.gew, 0);
  }, [faecher]);

  const upcomingKlausuren = useMemo(
    () =>
      klausuren
        .filter((k) => k.datum && new Date(k.datum) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a, b) => new Date(a.datum).getTime() - new Date(b.datum).getTime())
        .slice(0, 3),
    [klausuren],
  );

  const openTodos = useMemo(() => todos.filter((t) => t.status !== "done"), [todos]);
  const overdueTodos = useMemo(() => openTodos.filter((t) => isOverdue(t.due)), [openTodos]);

  const systemPrompt = `${PERSONA_PREFIX}
Du bist Subphonar, Johannas persönlicher Lern-Coach. Aktueller Stand: Gesamtschnitt ${
    gesamtschnitt ? gesamtschnitt.toFixed(2) : "—"
  }. Anstehende Klausuren: ${
    upcomingKlausuren.map((k) => `${k.title} (${k.fach}, ${formatDate(k.datum)})`).join("; ") || "keine"
  }. Offene Todos: ${openTodos.length} (${overdueTodos.length} überfällig). Antworte präzise, motivierend, auf Deutsch.`;

  async function generatePlan() {
    setPlanLoading(true);
    try {
      const now = new Date();
      const startHour = Math.max(14, now.getHours() + (now.getMinutes() > 30 ? 1 : 0));
      const startStr = `${String(startHour).padStart(2, "0")}:${now.getMinutes() > 30 ? "00" : "30"}`;
      const prompt = `Erstelle einen konkreten Lern-Tagesplan für HEUTE, der erst um ${startStr} Uhr startet (nicht früher) und bis ca. 22:00 läuft.
Klausuren: ${upcomingKlausuren.map((k) => `${k.title} in ${Math.ceil((new Date(k.datum).getTime() - Date.now()) / 86400000)} Tagen, Themen: ${k.themen.map((t) => `${t.name} [P:${t.prioritaet}]`).join(", ")}`).join(" | ") || "keine"}
Offene Todos: ${openTodos.slice(0, 10).map((t) => `${t.title} [${t.prioritaet}]${t.due ? ` bis ${t.due}` : ""}`).join("; ") || "keine"}

Regeln:
- 4–6 Time-Blocks im Format "HH:MM–HH:MM Thema/Aufgabe — kurzer Fokus".
- Lernblöcke max. 60–75 min, dazwischen kurze Pausen.
- Baue VERPFLICHTEND einen Sport-Block ein (45–60 min: Laufen, Krafttraining, Yoga oder Stretching) — wähle passend zur Tageszeit.
- Eine kurze Abend-Routine (Wiederholung / Karteikarten) am Schluss.
- Markdown, sehr kompakt, nur die Blocks + 1 abschließender Harvey-Specter-Push-Satz. Keine langen Einleitungen.`;
      const res = await chatFn({ data: { systemPrompt, messages: [{ role: "user", content: prompt }], files: [], model: "google/gemini-2.5-flash" } });
      setPlan(res.error ? `⚠️ ${res.error}` : res.text);
    } finally {
      setPlanLoading(false);
    }
  }

  async function generateTodosFromKlausur() {
    const next = upcomingKlausuren[0];
    if (!next) return;
    setPlanLoading(true);
    try {
      const prompt = `Für Klausur "${next.title}" (${next.fach}, in ${Math.ceil((new Date(next.datum).getTime() - Date.now()) / 86400000)} Tagen). Themen: ${next.themen.map((t) => `${t.name} [P:${t.prioritaet}, KP:${t.keypoints}]`).join("; ")}.
Erstelle 5-8 konkrete, kleine Lern-Aufgaben. Antworte NUR als JSON: {"todos":[{"title":"…","notes":"…","prioritaet":"hoch|mittel|niedrig"}]}`;
      const res = await chatFn({ data: { systemPrompt, messages: [{ role: "user", content: prompt }], files: [], model: "google/gemini-2.5-flash" } });
      if (res.error) return;
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as { todos: { title: string; notes?: string; prioritaet: "hoch" | "mittel" | "niedrig" }[] };
      const newTodos: Todo[] = parsed.todos.map((t, i) => ({
        id: Date.now() + i,
        status: "todo",
        title: t.title,
        notes: t.notes ?? "",
        prioritaet: t.prioritaet,
        due: "",
        klausurId: next.id,
      }));
      setTodos([...newTodos, ...todos]);
    } finally {
      setPlanLoading(false);
    }
  }

  const quote = HARVEY_QUOTES[quoteIdx];

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(aiOpen)}>
        <DailyHeader vocabTotal={5} />
        {/* Hero with Harvey background */}
        <div
          style={{
            position: "relative",
            backgroundImage: `linear-gradient(115deg, rgba(15,15,19,0.92) 0%, rgba(15,15,19,0.7) 45%, rgba(127,119,221,0.32) 100%), url(${harveyBg})`,
            backgroundSize: "cover",
            backgroundPosition: "center right",
            border: `1px solid ${C.purple}55`,
            borderRadius: 18,
            padding: "32px 34px",
            marginBottom: 20,
            boxShadow: `0 12px 40px -12px ${C.purple}55, inset 0 1px 0 rgba(255,255,255,0.05)`,
            overflow: "hidden",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", marginBottom: 10, gap: 8 }}>
            <div style={{ fontSize: 10, color: C.purpleLight, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 600 }}>
              ✦ Willkommen zurück, Johanna
            </div>
            <button
              style={{ ...s.smallBtn(C.amber), marginLeft: "auto", padding: "5px 11px", fontSize: 11 }}
              onClick={() => setQuoteIdx((i) => (i + 1) % HARVEY_QUOTES.length)}
              title="Neues Zitat"
            >
              🔄
            </button>
            <button
              style={{ ...s.smallBtn(C.purple), padding: "5px 12px", fontSize: 11 }}
              onClick={() => setAiOpen(!aiOpen)}
            >
              ✦ KI-Chat
            </button>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.4, marginBottom: 6, fontStyle: "italic", textShadow: "0 2px 12px rgba(0,0,0,0.6)", maxWidth: "78%" }}>
            „{quote.quote}"
          </div>
          <div style={{ fontSize: 12, color: C.purpleLight, textShadow: "0 1px 6px rgba(0,0,0,0.7)" }}>— Harvey Specter · {quote.context}</div>
        </div>

        {/* Daily Brief: 5 Englisch-Vokabeln + 1 Finanz-Thema (mit 🔄 Wechsel-Button) */}
        <DailyBrief />

        {/* KI Aktionen */}
        <div style={{ background: C.surface, border: `1px solid ${C.purple}33`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.purpleLight }}>✦ KI-Aktionen</div>
            <button
              style={{ ...s.smallBtn(C.purple), padding: "6px 14px", fontSize: 12, marginLeft: "auto" }}
              onClick={() => void generatePlan()}
              disabled={planLoading}
            >
              {planLoading ? "…" : "📅 KI-Tagesplan"}
            </button>
            <button
              style={{ ...s.smallBtn(C.amber), padding: "6px 14px", fontSize: 12 }}
              onClick={() => void generateTodosFromKlausur()}
              disabled={planLoading || upcomingKlausuren.length === 0}
              title={upcomingKlausuren.length === 0 ? "Keine Klausur geplant" : `Aus: ${upcomingKlausuren[0].title}`}
            >
              ✓ Todos aus Klausur
            </button>
          </div>
          {plan ? (
            <div style={{ background: C.surfaceHigh, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14, fontSize: 12, color: C.text, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {plan}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Lass dir einen Tagesplan aus deinen Klausuren & Todos generieren oder konkrete Lern-Aufgaben aus der nächsten Klausur ableiten.
            </div>
          )}
        </div>


        {/* Stat Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 28 }}>
          <StatCard
            label="Gesamtdurchschnitt"
            value={gesamtschnitt ? gesamtschnitt.toFixed(2) : "—"}
            color={C.purple}
            link="/noten"
            sub={gesamtschnitt ? "Notenübersicht öffnen" : "Noch keine Noten"}
          />
          <StatCard
            label="Anstehende Klausuren"
            value={String(upcomingKlausuren.length)}
            color={C.amber}
            link="/klausuren"
            sub={upcomingKlausuren[0] ? `Nächste: ${formatDate(upcomingKlausuren[0].datum)}` : "Keine geplant"}
          />
          <StatCard
            label="Offene Todos"
            value={String(openTodos.length)}
            color={overdueTodos.length ? C.red : C.teal}
            link="/todos"
            sub={overdueTodos.length ? `${overdueTodos.length} überfällig` : "Alles im Plan"}
          />
        </div>

        {/* Upcoming Klausuren */}
        <div style={s.sectionTitle}>📅 Anstehende Klausuren</div>
        {upcomingKlausuren.length === 0 ? (
          <EmptyState text="Keine Klausuren geplant. Lege eine neue an." link="/klausuren" cta="+ Klausur erstellen" />
        ) : (
          <div style={{ display: "grid", gap: 10, marginBottom: 28 }}>
            {upcomingKlausuren.map((k) => {
              const daysLeft = Math.ceil((new Date(k.datum).getTime() - Date.now()) / 86400000);
              return (
                <Link
                  key={k.id}
                  to="/klausuren/$id"
                  params={{ id: String(k.id) }}
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    borderRadius: 12,
                    padding: "14px 18px",
                    textDecoration: "none",
                    color: C.text,
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      background: daysLeft <= 3 ? C.redDim : daysLeft <= 7 ? C.amberDim : C.purpleDim,
                      color: daysLeft <= 3 ? "#F09595" : daysLeft <= 7 ? C.amber : C.purpleLight,
                      borderRadius: 8,
                      padding: "6px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 70,
                      textAlign: "center",
                    }}
                  >
                    {daysLeft === 0 ? "HEUTE" : `T-${daysLeft}`}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{k.title}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>
                      {k.fach} · {formatDate(k.datum)} · {k.themen.length} Themen
                    </div>
                  </div>
                  <span style={{ color: C.textDim, fontSize: 18 }}>→</span>
                </Link>
              );
            })}
          </div>
        )}

        {/* Open Todos preview */}
        <div style={s.sectionTitle}>✓ Offene Aufgaben</div>
        {openTodos.length === 0 ? (
          <EmptyState text="Keine offenen Todos. Lege eine Aufgabe an." link="/todos" cta="+ Todo erstellen" />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {openTodos.slice(0, 5).map((t) => (
              <Link
                key={t.id}
                to="/todos"
                style={{
                  background: C.surface,
                  border: `1px solid ${isOverdue(t.due) ? C.red + "55" : C.border}`,
                  borderRadius: 10,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  textDecoration: "none",
                  color: C.text,
                }}
              >
                <span style={{ fontSize: 16, color: t.status === "inProgress" ? C.amber : C.purpleLight }}>
                  {t.status === "inProgress" ? "◐" : "○"}
                </span>
                <span style={{ flex: 1, fontSize: 13 }}>{t.title}</span>
                {t.due && (
                  <span style={{ fontSize: 11, color: isOverdue(t.due) ? "#F09595" : C.textMuted }}>{formatDate(t.due)}</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      <AiPanel show={aiOpen} onClose={() => setAiOpen(false)} systemPrompt={systemPrompt} extraContext="Dashboard" />
    </div>
  );
}

function StatCard({ label, value, color, link, sub }: { label: string; value: string; color: string; link: string; sub: string }) {
  return (
    <Link
      to={link}
      style={{
        background: C.surface,
        border: `1px solid ${color}33`,
        borderRadius: 14,
        padding: "18px 22px",
        textDecoration: "none",
        color: C.text,
        display: "block",
      }}
    >
      <div style={{ fontSize: 10, color: C.textDim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color, marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 11, color: C.textMuted }}>{sub}</div>
    </Link>
  );
}

function EmptyState({ text, link, cta }: { text: string; link: string; cta: string }) {
  return (
    <div
      style={{
        background: C.surface,
        border: `1px dashed ${C.border}`,
        borderRadius: 12,
        padding: "24px",
        textAlign: "center",
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 10 }}>{text}</div>
      <Link
        to={link}
        style={{
          background: C.purpleDim,
          color: C.purpleLight,
          border: `1px solid ${C.purple}`,
          borderRadius: 8,
          padding: "6px 16px",
          fontSize: 12,
          textDecoration: "none",
          display: "inline-block",
        }}
      >
        {cta}
      </Link>
    </div>
  );
}
