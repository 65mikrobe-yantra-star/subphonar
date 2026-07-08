import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { C } from "@/lib/constants";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      title={mode === "dark" ? "Light Mode" : "Dark Mode"}
      style={{
        background: "transparent",
        border: `1px solid ${C.border}`,
        color: C.textMuted,
        width: 34, height: 34,
        borderRadius: 10,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {mode === "dark" ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
    </button>
  );
}
