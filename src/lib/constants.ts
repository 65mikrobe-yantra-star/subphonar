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

// Kinderfreundliche Palette:
// Dunkler, warmer Navy-Hintergrund + HELLE, klare Karten mit dunklem Text.
// Wichtige Regeln:
//   - text/textMuted/textDim   = dunkle Farben für Text AUF hellen Karten
//   - textOnDark/…OnDark        = helle Farben für Text AUF dunklem Chrome (Navbar, Page-Header, DailyHeader)
export const C = {
  purple: "#7C6BFF",
  purpleLight: "#B5ADFF",
  purpleDim: "#7C6BFF1F",
  amber: "#F59E0B",
  amberDim: "#F59E0B22",
  teal: "#10B981",
  tealDim: "#10B98122",
  red: "#EF4444",
  redDim: "#EF444422",

  // App-Hintergrund (dunkles, warmes Navy — nicht zu düster)
  bg: "#0E1730",

  // Karten-Oberflächen (HELL, freundlich, klarer Kontrast zum Navy)
  surface: "#FBFDFF",       // Soft-Weiß
  surfaceHigh: "#EAF5F1",   // sanftes Mintgrün für sekundäre Karten
  surfaceSky: "#E6EFFB",    // sanftes Hellblau (optional als Akzent)
  border: "#D8E1EC",
  borderLight: "#BFC9D8",

  // Text AUF hellen Karten (dunkles Anthrazit/Navy)
  text: "#1B2540",
  textMuted: "#4A5878",
  textDim: "#7A88A6",

  // Text AUF dunklem Chrome (Navbar, Page-Hero, DailyHeader-Panel)
  textOnDark: "#F5F7FF",
  textMutedOnDark: "#C9CEE6",
  textDimOnDark: "#8A90B0",

  // Chat-Panel: dunkles Glas mit hellen Message-Bubbles
  chatBg: "#0F1730",
  chatSurface: "#FBFDFF",
  chatBorder: "#D8E1EC",
  chatText: "#1B2540",
  chatMuted: "#4A5878",
  chatDim: "#7A88A6",
};
