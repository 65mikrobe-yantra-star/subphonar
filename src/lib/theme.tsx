/**
 * Sehr schlanker Theme-Toggle. Setzt `data-theme` auf <html>.
 * CSS in styles.css überschreibt Chrome-Farben (body, cards mit Klasse `.themed-surface`).
 * Volle Migration aller Inline-Styles auf CSS-Variablen kommt in einer Folge-Runde.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Mode = "dark" | "light";
const Ctx = createContext<{ mode: Mode; toggle: () => void }>({ mode: "dark", toggle: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>("dark");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sub.theme") as Mode | null;
      if (saved) setMode(saved);
    } catch { /* ignore */ }
  }, []);
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.setAttribute("data-theme", mode);
    try { localStorage.setItem("sub.theme", mode); } catch { /* ignore */ }
  }, [mode]);

  return <Ctx.Provider value={{ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
