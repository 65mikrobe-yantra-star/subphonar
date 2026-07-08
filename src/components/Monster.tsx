/**
 * Subby — der Mini-Drache (App-Maskottchen).
 *
 * SVG + framer-motion. Kein Runtime-Overhead durch Lottie/Rive im ersten Rollout.
 * Später kann `.lottie`-Datei via `@lottiefiles/dotlottie-react` direkt in derselben
 * Wrapper-Komponente hinter demselben `state`-Prop ausgetauscht werden (State-Machine bleibt).
 */
import { motion, AnimatePresence } from "framer-motion";
import type { CSSProperties } from "react";

export type MonsterState =
  | "idle"        // ruhig, sanftes Atmen
  | "cheer"      // richtig gelöst — Herz-Augen + Sprung
  | "sad"         // falsch — Kopf schräg, ohne Trauer
  | "sleep"       // Inaktivität — Zzz
  | "celebrate"   // Meilenstein — Krone + Konfetti
  | "streak"      // Login/Streak gerettet — Flammen-Aura
  | "watching"    // "Big Brother" Modus in Navbar
  | "panic";      // T-3 vor Klausur

interface Props {
  state: MonsterState;
  size?: number;
  onClick?: () => void;
  style?: CSSProperties;
}

const BODY = "#7F77DD";
const BODY_DARK = "#5D54C7";
const BELLY = "#FFD166";
const FLAME = "#FF6B4A";
const FLAME_HI = "#FFB84A";
const EYE = "#1A1A2E";

export function Monster({ state, size = 160, onClick, style }: Props) {
  const bounce = state === "cheer" || state === "streak" || state === "celebrate";
  const tilt = state === "sad" ? -14 : 0;
  const wobble = state === "panic";

  return (
    <motion.div
      onClick={onClick}
      style={{
        width: size,
        height: size,
        position: "relative",
        cursor: onClick ? "pointer" : "default",
        userSelect: "none",
        ...style,
      }}
      animate={{
        y: bounce ? [0, -8, 0] : wobble ? [0, -3, 0, 3, 0] : [0, -3, 0],
        rotate: tilt,
      }}
      transition={{
        y: { duration: wobble ? 0.35 : bounce ? 0.55 : 3, repeat: Infinity, ease: "easeInOut" },
        rotate: { duration: 0.4 },
      }}
    >
      {/* Streak-Flammen-Aura */}
      <AnimatePresence>
        {(state === "streak" || state === "celebrate") && (
          <motion.svg
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.85, scale: 1 }}
            exit={{ opacity: 0 }}
            viewBox="0 0 200 200"
            style={{ position: "absolute", inset: -10, width: size + 20, height: size + 20 }}
          >
            <defs>
              <radialGradient id="aura" cx="50%" cy="55%" r="55%">
                <stop offset="0%" stopColor={FLAME_HI} stopOpacity="0.9" />
                <stop offset="60%" stopColor={FLAME} stopOpacity="0.4" />
                <stop offset="100%" stopColor={FLAME} stopOpacity="0" />
              </radialGradient>
            </defs>
            <motion.circle
              cx="100" cy="110" r="88" fill="url(#aura)"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Krone bei celebrate */}
      <AnimatePresence>
        {state === "celebrate" && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", fontSize: size * 0.25, zIndex: 3 }}
          >
            👑
          </motion.div>
        )}
      </AnimatePresence>

      {/* Konfetti */}
      <AnimatePresence>
        {(state === "cheer" || state === "celebrate") && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                animate={{ opacity: 0, y: -60 - i * 8, x: (i - 2) * 22, scale: 0.4 }}
                transition={{ duration: 0.9, delay: i * 0.05 }}
                style={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  background: [FLAME, BELLY, BODY, "#5DCAA5", FLAME_HI][i],
                  zIndex: 4,
                }}
              />
            ))}
          </>
        )}
      </AnimatePresence>

      <svg viewBox="0 0 200 200" width={size} height={size} style={{ position: "relative", zIndex: 2, overflow: "visible" }}>
        <defs>
          <linearGradient id="body-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={BODY} />
            <stop offset="100%" stopColor={BODY_DARK} />
          </linearGradient>
          <linearGradient id="belly-grad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#FFE29A" />
            <stop offset="100%" stopColor={BELLY} />
          </linearGradient>
          <linearGradient id="tail-flame" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor={FLAME} />
            <stop offset="100%" stopColor={FLAME_HI} />
          </linearGradient>
        </defs>

        {/* Schwanz-Flamme (immer sichtbar, flackert) */}
        <motion.g
          animate={{ scaleY: [1, 1.15, 0.95, 1.1, 1], rotate: [0, 3, -2, 4, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "170px 140px" }}
        >
          <path d="M155 140 Q175 120 180 100 Q185 130 175 148 Q165 155 155 140 Z" fill="url(#tail-flame)" />
          <circle cx="176" cy="115" r="4" fill={BELLY} opacity="0.8" />
        </motion.g>

        {/* Schwanz-Basis */}
        <path d="M130 130 Q150 135 160 142 Q145 148 130 145 Z" fill="url(#body-grad)" />

        {/* Körper */}
        <ellipse cx="100" cy="120" rx="55" ry="52" fill="url(#body-grad)" />

        {/* Bauch */}
        <ellipse cx="100" cy="135" rx="34" ry="32" fill="url(#belly-grad)" />

        {/* Flügel (kleine, dran) */}
        <motion.g
          animate={{ rotate: bounce ? [-8, 12, -8] : [-2, 4, -2] }}
          transition={{ duration: bounce ? 0.35 : 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "60px 100px" }}
        >
          <path d="M55 105 Q30 90 25 115 Q35 125 55 122 Z" fill={BODY_DARK} opacity="0.85" />
        </motion.g>
        <motion.g
          animate={{ rotate: bounce ? [8, -12, 8] : [2, -4, 2] }}
          transition={{ duration: bounce ? 0.35 : 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "140px 100px" }}
        >
          <path d="M145 105 Q170 90 175 115 Q165 125 145 122 Z" fill={BODY_DARK} opacity="0.85" />
        </motion.g>

        {/* Kopf */}
        <ellipse cx="100" cy="80" rx="46" ry="42" fill="url(#body-grad)" />

        {/* Rücken-Zacken */}
        <path d="M78 48 L88 40 L92 52 Z" fill={BODY_DARK} />
        <path d="M100 44 L108 36 L112 50 Z" fill={BODY_DARK} />
        <path d="M120 50 L128 44 L128 58 Z" fill={BODY_DARK} />

        {/* Augen */}
        <AnimatePresence mode="wait">
          {state === "sleep" ? (
            <motion.g key="sleep" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <path d="M78 78 Q86 82 94 78" stroke={EYE} strokeWidth="3" fill="none" strokeLinecap="round" />
              <path d="M106 78 Q114 82 122 78" stroke={EYE} strokeWidth="3" fill="none" strokeLinecap="round" />
              <motion.text
                x="130" y="60" fontSize="16" fill={EYE} fontWeight="700"
                animate={{ opacity: [0, 1, 0], y: [60, 45, 30] }}
                transition={{ duration: 2, repeat: Infinity }}
              >Z</motion.text>
            </motion.g>
          ) : state === "cheer" ? (
            <motion.g key="cheer" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <path d="M78 82 L86 74 L94 82 L86 90 Z" fill="#E85D75" />
              <path d="M106 82 L114 74 L122 82 L114 90 Z" fill="#E85D75" />
            </motion.g>
          ) : state === "sad" ? (
            <motion.g key="sad" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <circle cx="86" cy="82" r="5" fill={EYE} />
              <circle cx="114" cy="82" r="5" fill={EYE} />
              <path d="M86 100 Q100 96 114 100" stroke={EYE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            </motion.g>
          ) : state === "panic" ? (
            <motion.g key="panic" animate={{ x: [-1, 1, -1] }} transition={{ duration: 0.15, repeat: Infinity }}>
              <circle cx="86" cy="82" r="7" fill="#fff" stroke={EYE} strokeWidth="1.5" />
              <circle cx="114" cy="82" r="7" fill="#fff" stroke={EYE} strokeWidth="1.5" />
              <circle cx="86" cy="82" r="3" fill={EYE} />
              <circle cx="114" cy="82" r="3" fill={EYE} />
            </motion.g>
          ) : state === "watching" ? (
            <motion.g key="watching">
              <circle cx="86" cy="82" r="6" fill="#fff" />
              <circle cx="114" cy="82" r="6" fill="#fff" />
              <motion.circle
                cx="86" cy="82" r="3" fill={EYE}
                animate={{ cx: [86, 89, 83, 86] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
              <motion.circle
                cx="114" cy="82" r="3" fill={EYE}
                animate={{ cx: [114, 117, 111, 114] }}
                transition={{ duration: 4, repeat: Infinity }}
              />
            </motion.g>
          ) : (
            <motion.g key="idle">
              <motion.g
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
                style={{ transformOrigin: "86px 82px" }}
              >
                <circle cx="86" cy="82" r="6" fill="#fff" />
                <circle cx="87" cy="82" r="3.5" fill={EYE} />
                <circle cx="88" cy="80" r="1" fill="#fff" />
              </motion.g>
              <motion.g
                animate={{ scaleY: [1, 1, 0.1, 1] }}
                transition={{ duration: 4, repeat: Infinity, times: [0, 0.92, 0.96, 1] }}
                style={{ transformOrigin: "114px 82px" }}
              >
                <circle cx="114" cy="82" r="6" fill="#fff" />
                <circle cx="115" cy="82" r="3.5" fill={EYE} />
                <circle cx="116" cy="80" r="1" fill="#fff" />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Nase/Schnauze */}
        <ellipse cx="100" cy="98" rx="9" ry="6" fill={BODY_DARK} opacity="0.5" />

        {/* Mund */}
        {state === "cheer" || state === "celebrate" || state === "streak" ? (
          <path d="M88 105 Q100 118 112 105" stroke={EYE} strokeWidth="2.5" fill={EYE} strokeLinejoin="round" />
        ) : state === "sad" ? (
          <path d="M90 112 Q100 106 110 112" stroke={EYE} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        ) : state === "panic" ? (
          <ellipse cx="100" cy="110" rx="4" ry="5" fill={EYE} />
        ) : (
          <path d="M92 108 Q100 112 108 108" stroke={EYE} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        )}

        {/* Wangen bei cheer */}
        {(state === "cheer" || state === "celebrate") && (
          <>
            <circle cx="72" cy="98" r="6" fill="#FF9BB0" opacity="0.7" />
            <circle cx="128" cy="98" r="6" fill="#FF9BB0" opacity="0.7" />
          </>
        )}
      </svg>
    </motion.div>
  );
}
