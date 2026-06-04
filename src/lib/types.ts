export type Mode = "note" | "punkte";

export type Note = { val: number; type: Mode; date: string };
export type Fach = { id: number; name: string; noten: Note[]; gewichtung: number };

export type Prioritaet = "hoch" | "mittel" | "niedrig";
export type Thema = {
  id: number;
  name: string;
  prioritaet: Prioritaet;
  zeit: string;
  keypoints: string;
  mindmap: string;
  offeneFragen: string;
  /** AI-filled: typische Verwechslungen / Fehler zu diesem Thema */
  verwechslungen?: string;
};

export type Flashcard = { question: string; answer: string };

export type MindmapStroke = {
  color: string;
  width: number;
  /** alternierend x,y Punkte */
  points: number[];
};

export type MockExamQuestion = {
  id: number;
  type: "kurz" | "lang" | "rechnung" | "mc";
  thema: string;
  punkte: number;
  frage: string;
  /** optional: choices for MC */
  choices?: string[];
  musterloesung?: string;
};

export type MockExamAnswer = {
  questionId: number;
  antwort: string;
  punkte?: number;
  feedback?: string;
};

export type MockExam = {
  id: number;
  createdAt: string;
  schwierigkeit: "leicht" | "mittel" | "schwer" | "fies";
  format: string;
  fokusThemen: string[];
  questions: MockExamQuestion[];
  answers: MockExamAnswer[];
  gesamtfeedback?: string;
  gesamtpunkte?: number;
  maxpunkte?: number;
  done?: boolean;
};

export type ErklaerEntry = {
  id: number;
  frage: string;
  antwort: string;
  date: string;
};

export type Klausur = {
  id: number;
  title: string;
  fach: string;
  datum: string;
  probleme: string;
  loesungen: string;
  themen: Thema[];
  /** persistierte Lernmaterialien */
  files?: FileBlock[];
  /** Mindmap-Strokes (handschriftlich) */
  mindmap?: MindmapStroke[];
  /** Probeklausuren */
  exams?: MockExam[];
  /** Altklausuren (für Lehrerstil) */
  altklausuren?: FileBlock[];
  /** Erklärbär-Verlauf */
  erklaerungen?: ErklaerEntry[];
  /** Executive Summary Cache */
  summary?: string;
  /** Thema-spezifische Flashcards */
  themaFlashcards?: Record<number, Flashcard[]>;
};

export type Todo = {
  id: number;
  title: string;
  notes: string;
  status: "todo" | "inProgress" | "done";
  prioritaet: Prioritaet;
  due: string;
  klausurId?: number;
};

export type FileBlock =
  | { name: string; type: "pdf"; data: string; mimeType: string }
  | { name: string; type: "image"; data: string; mimeType: string }
  | { name: string; type: "text"; data: string; mimeType: string };

export type ChatMessage = { role: "user" | "assistant"; content: string };
