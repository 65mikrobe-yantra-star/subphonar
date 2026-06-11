import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { C, PERSONA_PREFIX } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { chat } from "@/lib/ai.functions";

type Vocab = { word: string; ipa?: string; translation: string; example: string };
type Brief = { date: string; vocab: Vocab[]; finance: { topic: string; explanation: string } };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function DailyBrief() {
  const [brief, setBrief] = useLocalStorage<Brief | null>("sub.daily.brief", null);
  const [history, setHistory] = useLocalStorage<string[]>("sub.daily.finance.history", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatFn = useServerFn(chat);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const excluded = history.slice(-14).join(", ");
      const prompt = `Erstelle Johannas tägliches Lern-Briefing für ${todayKey()}.
Liefere AUSSCHLIESSLICH valides JSON in folgendem Schema (kein Markdown, kein Fließtext drumherum):
{
  "vocab": [
    {"word":"…","ipa":"…","translation":"…","example":"…"},
    … insgesamt 5 nützliche Englisch-Vokabeln auf solidem B1/B2-Schul-Niveau, die Johanna in Klausuren / Aufsätzen / mündlichen Prüfungen tatsächlich verwenden kann (Verben, Adjektive, Übergangswörter, gängige Kollokationen — KEINE seltenen Spezialbegriffe).
  ],
  "finance": {
    "topic":"… (nur der Name der Kennzahl / des Konzepts)",
    "explanation":"klare, kompakte Erklärung in 3-5 Sätzen auf Deutsch, mit Mini-Beispiel + Formel falls passend."
  }
}

Wähle als Finanz-Thema eine wichtige Kennzahl oder ein Business-Konzept, das in den letzten 14 Tagen NOCH NICHT dran war. Bereits verwendet (NICHT wiederholen): ${excluded || "noch keine"}.

Mögliche Themen (nur Beispiele, nicht alles auf einmal): EBIT, EBITDA-Marge, Umsatzrendite, Eigenkapitalquote, Anlagendeckungsgrad I+II, Cash Conversion Cycle, DuPont-Analyse, Break-Even-Point, Marktanteil, WACC, Asset Turnover, ROE, ROA, Gesamtkapitalrentabilität, Operating Cashflow, Free Cashflow, Verschuldungsgrad, Zinsdeckungsgrad, Aktueller Liquiditätsgrad, Quick Ratio, Bruttomarge, Nettomarge, Kapitalkosten, Opportunity Cost, Economies of Scale, Marginalkosten, Lernkurve, Goodwill, Amortisation, Leverage-Effekt, Share Buyback, Spin-off, Joint Venture.

Beispielsätze sollen schultauglich und alltagsnah sein.`;
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
      setBrief({ date: todayKey(), ...parsed });
      setHistory((prev) => [...prev.slice(-13), parsed.finance.topic]);
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
              🇬🇧 5 English Words of the Day
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {brief.vocab.map((v, i) => (
                <div key={i} style={{ background: C.surfaceHigh, borderRadius: 8, padding: "8px 10px", border: `1px solid ${C.border}` }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.purpleLight }}>{v.word}</span>
                    {v.ipa && <span style={{ fontSize: 10, color: C.textDim }}>/{v.ipa}/</span>}
                    <span style={{ fontSize: 12, color: C.text }}>— {v.translation}</span>
                  </div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontStyle: "italic", marginTop: 3 }}>„{v.example}"</div>
                </div>
              ))}
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
