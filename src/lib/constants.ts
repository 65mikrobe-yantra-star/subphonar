import type { Fach, Prioritaet } from "./types";

export const APP_NAME = "Subphonar";

/** Persönlicher Coach-Vorsatz für alle KI-Aufrufe. Die Nutzerin heißt Johanna. */
export const PERSONA_PREFIX = `Du sprichst die Nutzerin IMMER persönlich mit "Johanna" an (z.B. "Johanna, …"). Sei warm, klar, präzise. Antworte auf Deutsch.
WICHTIG: Antworte KNAPP und PRÄZISE — maximal 4–6 Sätze oder kompakte Bullet-Liste. Keine Floskeln, keine Wiederholung der Frage, keine Disclaimer. Nur dann ausführlicher, wenn Johanna ausdrücklich "ausführlich", "lang" oder "im Detail" verlangt.`;

export const HARVEY_QUOTES = [
  { quote: "I don't play the odds, I play the man.", context: "Über Strategie" },
  { quote: "When you're backed against the wall, break the goddamn thing down.", context: "Über Hindernisse" },
  { quote: "Work until you no longer have to introduce yourself.", context: "Über Ehrgeiz" },
  { quote: "Winners don't make excuses when the other side plays the game.", context: "Über Verantwortung" },
  { quote: "Confidence is not 'they will like me'. Confidence is 'I'll be fine if they don't'.", context: "Über innere Stärke" },
  { quote: "The only time success comes before work is in the dictionary.", context: "Über Leistung" },
  { quote: "Don't raise your voice. Improve your argument.", context: "Über Überzeugung" },
  { quote: "Anyone can do my job, but no one can be me.", context: "Über Einzigartigkeit" },
  { quote: "I'm not interested in great. I want to know what's next.", context: "Über Ambitionen" },
  { quote: "Sorry, I can't hear you over the sound of how awesome I am.", context: "Über Selbstbewusstsein" },
];

export const PRIORITY_COLORS: Record<Prioritaet, { bg: string; text: string; label: string }> = {
  hoch: { bg: "#7F77DD", text: "#fff", label: "Hoch" },
  mittel: { bg: "#EF9F27", text: "#fff", label: "Mittel" },
  niedrig: { bg: "#1D9E75", text: "#fff", label: "Niedrig" },
};

export const STATUS_COLUMNS = [
  { id: "todo" as const, label: "Zu erledigen", color: "#7F77DD", icon: "○" },
  { id: "inProgress" as const, label: "In Arbeit", color: "#EF9F27", icon: "◐" },
  { id: "done" as const, label: "Erledigt", color: "#1D9E75", icon: "●" },
];

export const THEMA_STATUS_COLUMNS = [
  { id: "offen" as const, label: "Offen", color: "#7F77DD", icon: "○", hint: "Noch nicht angefangen" },
  { id: "lernend" as const, label: "Am Lernen", color: "#EF9F27", icon: "◐", hint: "In Bearbeitung" },
  { id: "sitzt" as const, label: "Sitzt", color: "#1D9E75", icon: "●", hint: "Kann ich" },
];

export const TYP_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  theorie:    { label: "Theorie",    color: "#7F77DD", icon: "📖" },
  rechnung:   { label: "Rechnung",   color: "#EF9F27", icon: "🧮" },
  freitext:   { label: "Freitext",   color: "#AFA9EC", icon: "✍️" },
  mc:         { label: "Multiple Choice", color: "#1D9E75", icon: "☑" },
  vokabeln:   { label: "Vokabeln",   color: "#E05A2B", icon: "🔤" },
  anwendung:  { label: "Anwendung",  color: "#5DCAA5", icon: "⚙️" },
};

export const FAECHER_DEFAULT: Fach[] = [
  { id: 1, name: "Deutsch", noten: [], gewichtung: 1 },
  { id: 2, name: "Mathematik", noten: [], gewichtung: 1 },
  { id: 3, name: "Englisch", noten: [], gewichtung: 1 },
  { id: 4, name: "Geschichte", noten: [], gewichtung: 1 },
  { id: 5, name: "Wirtschaft", noten: [], gewichtung: 1 },
];

// Dark palette
export const C = {
  purple: "#7F77DD",
  purpleLight: "#AFA9EC",
  purpleDim: "#7F77DD22",
  amber: "#EF9F27",
  amberDim: "#EF9F2722",
  teal: "#1D9E75",
  tealDim: "#1D9E7522",
  red: "#A32D2D",
  redDim: "#A32D2D22",
  bg: "#0f1018",
  surface: "#191a25",
  surfaceHigh: "#232432",
  border: "#33344a",
  borderLight: "#444560",
  text: "#f1f1f5",
  textMuted: "#9a9ab0",
  textDim: "#6a6a82",
  chatBg: "#ffffff",
  chatSurface: "#f4f4f8",
  chatBorder: "#e0e0e8",
  chatText: "#1a1a2a",
  chatMuted: "#666",
  chatDim: "#999",
};
