import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { C, PERSONA_PREFIX } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { chat } from "@/lib/ai.functions";

type Vocab = { word: string; ipa?: string; translation: string; example: string; repeat?: boolean };
type Brief = { date: string; vocab: Vocab[]; finance: { topic: string; explanation: string } };
type VocabHistory = { word: string; ipa?: string; translation: string; example: string }[];
type VocabProgress = { date: string; learned: number[] };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyBrief() {
  const [brief, setBrief] = useLocalStorage<Brief | null>("sub.daily.brief", null);
  const [history, setHistory] = useLocalStorage<string[]>("sub.daily.finance.history", []);
  const [vocabHistory, setVocabHistory] = useLocalStorage<VocabHistory>("sub.daily.vocab.history", []);
  const [progress, setProgress] = useLocalStorage<VocabProgress>("sub.vocab.learned", { date: "", learned: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatFn = useServerFn(chat);

  const learnedToday = progress.date === todayKey() ? progress.learned : [];
  function toggleLearned(i: number) {
    const today = todayKey();
    const base = progress.date === today ? progress.learned : [];
    const next = base.includes(i) ? base.filter((x) => x !== i) : [...base, i];
    setProgress({ date: today, learned: next });
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const excluded = history.slice(-14).join(", ");
      const recentWords = vocabHistory.slice(-40).map((v) => v.word).join(", ");
      const prompt = `Erstelle Johannas tägliches Lern-Briefing für ${todayKey()}.
Liefere AUSSCHLIESSLICH valides JSON (kein Markdown):
{
  "vocab": [
    {"word":"…","ipa":"…","translation":"…","example":"…"}
    … genau 5 NEUE, hochwertige Englisch-Vokabeln auf gehobenem B2/C1-Schul-Niveau, die in Klausuren / Essays / mündlichen Prüfungen echten Eindruck machen (starke Verben, präzise Adjektive, elegante Übergangswörter, gängige akademische Kollokationen). KEINE Basiswörter, KEINE seltenen Spezialbegriffe. Jede besser als typische Schulbuch-Wahl.
  ],
  "finance": {
    "topic":"…",
    "explanation":"klare Erklärung in 3-5 Sätzen auf Deutsch, mit Mini-Beispiel + Formel falls passend."
  }
}

WICHTIG: Verwende NICHT diese kürzlich gezeigten Wörter: ${recentWords || "noch keine"}.
Finanz-Thema NICHT wiederholen: ${excluded || "noch keine"}.
Mögliche Finanz-Themen (Beispiele): EBIT, EBITDA-Marge, Umsatzrendite, Eigenkapitalquote, Cash Conversion Cycle, DuPont-Analyse, Break-Even, WACC, ROE, ROA, Free Cashflow, Verschuldungsgrad, Quick Ratio, Bruttomarge, Opportunity Cost, Economies of Scale, Marginalkosten, Goodwill, Leverage-Effekt, Spin-off, Joint Venture.

Beispielsätze schultauglich und alltagsnah.`;
      const res = await chatFn({
        data: {
          systemPrompt: PERSONA_PREFIX,
          messages: [{ role: "user", content: prompt }],
          files: [],
          model: "google/gemini-2.5-flash",
        },
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const clean = res.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as Omit<Brief, "date">;
      // 5 neue + 2 Wiederholungen aus dem letzten Pool
      const pool = vocabHistory.filter((v) => !parsed.vocab.some((n) => n.word.toLowerCase() === v.word.toLowerCase()));
      const shuffled = [...pool].sort(() => Math.random() - 0.5);
      const repeats: Vocab[] = shuffled.slice(0, 2).map((v) => ({ ...v, repeat: true }));
      const combined = [...parsed.vocab.map((v) => ({ ...v, repeat: false })), ...repeats];
      setBrief({ date: todayKey(), vocab: combined, finance: parsed.finance });
      setHistory((prev) => [...prev.slice(-13), parsed.finance.topic]);
      // Neue Vokabeln in History mergen (max 60 behalten)
      setVocabHistory((prev) => {
        const merged = [...prev];
        for (const v of parsed.vocab) {
          if (!merged.some((m) => m.word.toLowerCase() === v.word.toLowerCase())) {
            merged.push({ word: v.word, ipa: v.ipa, translation: v.translation, example: v.example });
          }
        }
        return merged.slice(-60);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Konnte Briefing nicht laden.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!brief || brief.date !== todayKey()) {
      void generate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ background: C.surface, border: `1px solid ${C.amber}33`, borderRadius: 12, padding: 16, marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.amber }}>☀️ Johannas Daily Brief</div>
        <div style={{ fontSize: 10, color: C.textDim }}>{todayKey()}</div>
        <button
          style={{ ...s.smallBtn(C.amber), padding: "5px 12px", fontSize: 11, marginLeft: "auto" }}
          onClick={() => void generate()}
          disabled={loading}
        >
          {loading ? "…" : "🔄 Neu"}
        </button>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#F09595", marginBottom: 10 }}>⚠ {error}</div>
      )}

      {!brief && loading && (
        <div style={{ fontSize: 12, color: C.textMuted, padding: 10 }}>Lade Vokabeln & Finanz-Thema…</div>
      )}

      {brief && (
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              🇬🇧 7 English Words · 5 neu + 2 Wiederholung
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {brief.vocab.map((v, i) => {
                const done = learnedToday.includes(i);
                return (
                  <div key={i} style={{
                    background: done ? `${C.teal}18` : C.surfaceHigh,
                    borderRadius: 8, padding: "8px 10px",
                    border: `1px solid ${done ? C.teal + "66" : C.border}`,
                    display: "flex", alignItems: "flex-start", gap: 10,
                    transition: "all 200ms ease",
                  }}>
                    <button
                      onClick={() => toggleLearned(i)}
                      title={done ? "Als 'noch nicht gelernt' markieren" : "Als gelernt markieren"}
                      style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        border: `1.5px solid ${done ? C.teal : C.borderLight}`,
                        background: done ? C.teal : "transparent",
                        color: "#fff", cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 160ms ease",
                      }}
                    >
                      {done && <Check size={13} strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: done ? C.teal : C.purpleLight, textDecoration: done ? "line-through" : "none" }}>{v.word}</span>
                        {v.ipa && <span style={{ fontSize: 10, color: C.textDim }}>/{v.ipa}/</span>}
                        <span style={{ fontSize: 12, color: C.text }}>— {v.translation}</span>
                        {v.repeat && (
                          <span style={{ fontSize: 9, color: C.amber, background: C.amberDim, border: `1px solid ${C.amber}55`, padding: "1px 6px", borderRadius: 99, fontWeight: 700, letterSpacing: "0.05em" }}>WDH</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic", marginTop: 3 }}>„{v.example}"</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
              💼 Business / Finanz-Thema
            </div>
            <div style={{ background: C.surfaceHigh, borderRadius: 8, padding: 12, border: `1px solid ${C.amber}33`, height: "100%", boxSizing: "border-box" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.amber, marginBottom: 6 }}>{brief.finance.topic}</div>
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{brief.finance.explanation}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
