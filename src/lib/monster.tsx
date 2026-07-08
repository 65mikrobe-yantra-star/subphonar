/**
 * MonsterProvider — globale State-Machine für Subby.
 *
 * Handhabt:
 *  - aktueller Animations-State + Sprechblasen-Text
 *  - Inaktivitäts-Timer (5 min → "sleep")
 *  - Trigger-API: `useMonster().fire('correct' | 'wrong' | ...)`
 *
 * Andere Komponenten dispatchen via `useMonster()`; Rendering übernimmt <Monster/> in Header / Nav.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { MonsterState } from "@/components/Monster";

export type MonsterTrigger =
  | "login"        // Tages-Login / Streak gerettet
  | "correct"      // Aufgabe richtig
  | "wrong"        // Aufgabe falsch
  | "milestone"    // Kapitel/Klausur beendet
  | "examSoon"     // T-3 vor Klausur
  | "inactive"     // 5 min ohne Input
  | "reset";       // zurück zu idle

interface MonsterCtx {
  state: MonsterState;
  message: string | null;
  fire: (t: MonsterTrigger, ctx?: { streak?: number }) => void;
  dismiss: () => void;
}

const Ctx = createContext<MonsterCtx | null>(null);

const CHEER = ["Boom.", "Genau so.", "Note that down — smooth.", "Sitzt.", "Nächstes."];
const WRONG_HARVEY = [
  "I don't have dreams, I have goals. Nochmal.",
  "Loser geben auf. Du nicht.",
  "That's what losers do. Winners find out why.",
  "Kein Drama. Nur die nächste Runde.",
];
const LOGIN = (n: number) => [
  `Tag ${n}. 🔥 Champions show up.`,
  `Streak gehalten. ${n} Tage clean.`,
  `Day ${n}. Keep the machine running.`,
][Math.floor(Math.random() * 3)];
const SLEEP = ["Hey. Noch da?", "Die Klausur wartet nicht.", "Aufwachen, Champion."];
const MILE = ["Kapitel platt gemacht. 👑", "Das war Arbeit. Anerkannt.", "Nächstes Level."];
const PANIC = ["3 Tage. Fokus jetzt.", "Countdown läuft — aber du weißt, was zu tun ist."];

function pick(a: string[]) { return a[Math.floor(Math.random() * a.length)]; }

const AUTO_DISMISS_MS = 4500;
const INACTIVE_MS = 5 * 60 * 1000;

export function MonsterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MonsterState>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactiveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleReset() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setState("idle");
      setMessage(null);
    }, AUTO_DISMISS_MS);
  }

  function fire(t: MonsterTrigger, ctx?: { streak?: number }) {
    switch (t) {
      case "login":
        setState("streak");
        setMessage(LOGIN(ctx?.streak ?? 1));
        scheduleReset();
        break;
      case "correct":
        setState("cheer");
        setMessage(pick(CHEER));
        scheduleReset();
        break;
      case "wrong":
        setState("sad");
        setMessage(pick(WRONG_HARVEY));
        scheduleReset();
        break;
      case "milestone":
        setState("celebrate");
        setMessage(pick(MILE));
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => { setState("idle"); setMessage(null); }, 6000);
        break;
      case "examSoon":
        setState("panic");
        setMessage(pick(PANIC));
        scheduleReset();
        break;
      case "inactive":
        setState("sleep");
        setMessage(pick(SLEEP));
        break;
      case "reset":
        if (timerRef.current) clearTimeout(timerRef.current);
        setState("idle");
        setMessage(null);
        break;
    }
  }

  // Inaktivitäts-Tracker (nur clientseitig)
  useEffect(() => {
    if (typeof window === "undefined") return;
    function resetInactive() {
      if (inactiveRef.current) clearTimeout(inactiveRef.current);
      // wenn gerade schläft, wieder wecken
      setState((s) => (s === "sleep" ? "idle" : s));
      setMessage((m) => (state === "sleep" ? null : m));
      inactiveRef.current = setTimeout(() => fire("inactive"), INACTIVE_MS);
    }
    const events: (keyof WindowEventMap)[] = ["mousemove", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, resetInactive, { passive: true }));
    resetInactive();
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetInactive));
      if (inactiveRef.current) clearTimeout(inactiveRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ state, message, fire, dismiss: () => { setMessage(null); setState("idle"); } }), [state, message]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMonster() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useMonster must be inside <MonsterProvider>");
  return c;
}
