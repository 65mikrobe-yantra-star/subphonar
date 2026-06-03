import { useState } from "react";
import { C } from "@/lib/constants";
import { s } from "@/lib/ui-styles";

export type Flashcard = { question: string; answer: string };

type Props = {
  cards: Flashcard[];
  onClose: () => void;
};

export function FlashcardView({ cards, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);

  if (!cards.length) return null;
  const done = idx >= cards.length;

  function answer(ok: boolean) {
    setResults([...results, ok]);
    setFlipped(false);
    setTimeout(() => setIdx(idx + 1), 150);
  }

  if (done) {
    const ok = results.filter(Boolean).length;
    return (
      <div style={{ textAlign: "center", padding: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>
          {ok === cards.length ? "🏆" : ok >= cards.length * 0.7 ? "💪" : "📚"}
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: C.purpleLight, marginBottom: 8 }}>
          {ok}/{cards.length} richtig
        </div>
        <div style={{ fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
          {ok === cards.length
            ? "Harvey wäre stolz."
            : ok >= cards.length * 0.7
              ? "Solide — nochmal für 100%."
              : "Wiederhole die schwachen Themen."}
        </div>
        <button
          style={{ ...s.btnP, width: "auto", padding: "9px 28px" }}
          onClick={() => {
            setIdx(0);
            setFlipped(false);
            setResults([]);
          }}
        >
          Nochmal
        </button>
        <div style={{ height: 10 }} />
        <button style={{ ...s.btnS, width: "auto", padding: "9px 28px" }} onClick={onClose}>
          Zurück
        </button>
      </div>
    );
  }

  const card = cards[idx];
  return (
    <div style={{ padding: "0 4px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: C.textMuted }}>
          {idx + 1} / {cards.length}
        </span>
        <div style={{ display: "flex", gap: 3 }}>
          {cards.map((_, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background:
                  i < idx
                    ? results[i]
                      ? C.teal
                      : C.red
                    : i === idx
                      ? C.purple
                      : C.border,
              }}
            />
          ))}
        </div>
        <button style={s.smallBtn(C.textMuted)} onClick={onClose}>
          ✕
        </button>
      </div>
      <div
        onClick={() => setFlipped(!flipped)}
        style={{
          background: flipped ? C.purpleDim : C.surfaceHigh,
          border: `1px solid ${flipped ? C.purple + "66" : C.border}`,
          borderRadius: 14,
          padding: "32px 24px",
          minHeight: 160,
          cursor: "pointer",
          textAlign: "center",
          transition: "all 0.2s",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
          {flipped ? "Antwort" : "Frage — klicken zum Aufdecken"}
        </div>
        <div style={{ fontSize: 15, color: flipped ? C.purpleLight : C.text, fontWeight: flipped ? 600 : 400, lineHeight: 1.6 }}>
          {flipped ? card.answer : card.question}
        </div>
      </div>
      {flipped && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <button
            style={{
              background: C.redDim,
              border: `1px solid ${C.red}55`,
              color: "#F09595",
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => answer(false)}
          >
            ✕ Noch nicht
          </button>
          <button
            style={{
              background: C.tealDim,
              border: `1px solid ${C.teal}55`,
              color: "#5DCAA5",
              borderRadius: 10,
              padding: 10,
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
            }}
            onClick={() => answer(true)}
          >
            ✓ Gewusst
          </button>
        </div>
      )}
    </div>
  );
}
