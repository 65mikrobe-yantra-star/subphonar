import type { FileBlock } from "./types";

/** Entfernt Markdown-Artefakte (Sternchen, Unterstriche, Backticks, Header-#) für sauberen Plain-Text. */
export function cleanMarkdown(txt: string): string {
  if (!txt) return "";
  return txt
    .replace(/\*\*\*(.+?)\*\*\*/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}


export function formatDate(d?: string | Date | null): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function isOverdue(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d < now && d.toDateString() !== now.toDateString();
}

export function avg(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

export function notenFarbe(n: number): string {
  if (n <= 1.5) return "#1D9E75";
  if (n <= 2.5) return "#7F77DD";
  if (n <= 3.5) return "#EF9F27";
  if (n <= 4.0) return "#E05A2B";
  return "#A32D2D";
}

export function punkteFarbe(p: number): string {
  if (p >= 13) return "#1D9E75";
  if (p >= 10) return "#7F77DD";
  if (p >= 7) return "#EF9F27";
  if (p >= 5) return "#E05A2B";
  return "#A32D2D";
}

export function punkte2Note(p: number): number | null {
  const map: Record<number, number> = {
    15: 1.0, 14: 1.0, 13: 1.0, 12: 1.3, 11: 1.7, 10: 2.0,
    9: 2.3, 8: 2.7, 7: 3.0, 6: 3.3, 5: 3.7, 4: 4.0,
    3: 4.3, 2: 4.7, 1: 5.0, 0: 6.0,
  };
  return map[Math.round(p)] ?? null;
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => {
      const result = r.result as string;
      res(result.split(",")[1]);
    };
    r.onerror = () => rej(new Error("read failed"));
    r.readAsDataURL(file);
  });
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("read failed"));
    r.readAsText(file);
  });
}

export async function processFile(file: File): Promise<FileBlock> {
  const mime = file.type;
  if (mime === "application/pdf")
    return { name: file.name, type: "pdf", data: await readFileAsBase64(file), mimeType: mime };
  if (mime.startsWith("image/"))
    return { name: file.name, type: "image", data: await readFileAsBase64(file), mimeType: mime };
  return { name: file.name, type: "text", data: await readFileAsText(file), mimeType: mime };
}
