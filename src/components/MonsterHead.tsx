/** Kleiner "Big Brother"-Kopf oben rechts in der Navbar. Zeigt Sprechblasen. */
import { AnimatePresence, motion } from "framer-motion";
import { Monster } from "./Monster";
import { useMonster } from "@/lib/monster";
import { C } from "@/lib/constants";

export function MonsterHead() {
  const { state, message, dismiss } = useMonster();
  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <Monster state={state === "idle" ? "watching" : state} size={40} onClick={dismiss} />
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.9 }}
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              marginTop: 8,
              background: "#fff",
              color: C.chatText,
              padding: "8px 12px",
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              boxShadow: "0 8px 24px -6px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)",
              whiteSpace: "nowrap",
              maxWidth: 260,
              zIndex: 300,
            }}
          >
            <div style={{
              position: "absolute", top: -5, right: 14,
              width: 10, height: 10, background: "#fff",
              transform: "rotate(45deg)",
              boxShadow: "-1px -1px 0 rgba(0,0,0,0.05)",
            }} />
            {message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
