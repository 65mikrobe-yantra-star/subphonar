import { useAiPaused } from "@/lib/ai-client";
import { C } from "@/lib/constants";

export function AiQuotaBanner() {
  const paused = useAiPaused();
  if (!paused) return null;
  return (
    <div
      style={{
        position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 60,
        background: C.surface, color: C.text, border: `1px solid ${C.amber}66`,
        borderRadius: 12, padding: "8px 14px", fontSize: 12, fontWeight: 600,
        boxShadow: "0 6px 20px rgba(0,0,0,0.25)", maxWidth: "92vw", textAlign: "center",
      }}
    >
      ✦ KI-Kontingent für diesen Monat aufgebraucht – alles andere funktioniert weiter.
    </div>
  );
}
