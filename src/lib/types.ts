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
};

export type Klausur = {
  id: number;
  title: string;
  fach: string;
  datum: string;
  probleme: string;
  loesungen: string;
  themen: Thema[];
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
