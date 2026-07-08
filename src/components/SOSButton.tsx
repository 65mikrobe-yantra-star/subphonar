/** Notfall-Button: "Ich bin überfordert" — bietet Atemübung, Pep-Talk, Plan runterschrauben. */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LifeBuoy, Wind, MessageCircleHeart, Scissors, X } from "lucide-react";
import { C } from "@/lib/constants";
import { useMonster } from "@/lib/monster";
import { Monster } from "./Monster";

interface Props {
  onShrinkPlan?: () => void;
}

export function SOSButton({ onShrinkPlan }: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<null | "breathe" | "pep">(null);
  const { fire } = useMonster();

  function close() { setOpen(false); setMode(null); }

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: `linear-gradient(135deg, ${C.amber}, #FF5B3C)`,
          color: "#fff",
          border: "none",
          borderRadius: 999,
          padding: "12px 18px",
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: `0 10px 30px -8px ${C.amber}99`,
          zIndex: 250,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <LifeBuoy size={18} strokeWidth={2.4} />
        Überfordert?
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={close}
            style={{ position: "fixed", inset: 0, background: "rgba(10,10,20,0.6)", backdropFilter: "blur(6px)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "#fff",
                borderRadius: 24,
                padding: 28,
                width: "100%",
                maxWidth: 420,
                position: "relative",
                boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
              }}
            >
              <button onClick={close} style={{ position: "absolute", top: 14, right: 14, background: "transparent", border: "none", cursor: "pointer", color: "#999" }}>
                <X size={20} />
              </button>

              {mode === "breathe" ? (
                <BreatheView onDone={close} />
              ) : mode === "pep" ? (
                <PepTalkView onDone={close} />
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <Monster state="sad" size={100} />
                  </div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: "#1a1a2e", textAlign: "center", margin: "0 0 6px" }}>
                    Alles gut, Johanna.
                  </h2>
                  <p style={{ fontSize: 13, color: "#666", textAlign: "center", margin: "0 0 22px", lineHeight: 1.5 }}>
                    Was brauchst du gerade? Wähl eins — kein Falsch.
                  </p>

                  <div style={{ display: "grid", gap: 10 }}>
                    <SOSOption icon={<Wind size={20} />} title="1 Minute durchatmen" sub="Kurze Übung. Kopf klar."
                      color={C.teal} onClick={() => setMode("breathe")} />
                    <SOSOption icon={<MessageCircleHeart size={20} />} title="Pep-Talk von Subby" sub="Du kriegst kurz was aufs Ohr."
                      color={C.purple} onClick={() => setMode("pep")} />
                    <SOSOption icon={<Scissors size={20} />} title="Heutigen Plan halbieren" sub="Nur das Wichtigste bleibt."
                      color={C.amber} onClick={() => { onShrinkPlan?.(); fire("correct"); close(); }} />
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SOSOption({ icon, title, sub, color, onClick }: { icon: React.ReactNode; title: string; sub: string; color: string; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 16px", borderRadius: 16,
        background: `${color}15`, border: `1.5px solid ${color}33`,
        cursor: "pointer", textAlign: "left", width: "100%",
      }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e" }}>{title}</div>
        <div style={{ fontSize: 12, color: "#777", marginTop: 2 }}>{sub}</div>
      </div>
    </motion.button>
  );
}

function BreatheView({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: "0 0 20px" }}>Atme mit</h2>
      <div style={{ position: "relative", width: 180, height: 180, margin: "0 auto 20px" }}>
        <motion.div
          animate={{ scale: [1, 1.5, 1.5, 1], opacity: [0.6, 1, 1, 0.6] }}
          transition={{ duration: 8, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
          style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: `radial-gradient(circle, ${C.teal}88, ${C.teal}22)`,
          }}
        />
        <motion.div
          animate={{ opacity: [1, 0, 0, 1] }}
          transition={{ duration: 8, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700 }}
        >
          Einatmen
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{ duration: 8, repeat: Infinity, times: [0, 0.4, 0.6, 1] }}
          style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700 }}
        >
          Ausatmen
        </motion.div>
      </div>
      <button onClick={onDone} style={{ background: C.teal, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Weiter machen</button>
    </div>
  );
}

function PepTalkView({ onDone }: { onDone: () => void }) {
  const lines = [
    "Du machst das nicht, weil es leicht ist. Du machst es, weil es dir wichtig ist.",
    "Ein kleiner Schritt jetzt schlägt einen perfekten Plan morgen.",
    "Winners don't feel like winning every day. They show up anyway.",
    "Du hast schon härtere Tage gemeistert. Dieser ist keine Ausnahme.",
  ];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return (
    <div style={{ textAlign: "center", padding: "10px 0" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
        <Monster state="streak" size={120} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e", lineHeight: 1.5, marginBottom: 20, fontStyle: "italic" }}>„{line}"</div>
      <button onClick={onDone} style={{ background: C.purple, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Los geht's</button>
    </div>
  );
}
