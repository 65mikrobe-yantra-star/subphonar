import { useEffect } from "react";
import { Flame, Target, BookOpen } from "lucide-react";
import { C } from "@/lib/constants";
import { useLocalStorage } from "@/lib/storage";

type Streak = { count: number; lastDate: string };
type VocabProgress = { date: string; learned: number[] };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function useDailyStreak() {
  const [streak, setStreak] = useLocalStorage<Streak>("sub.streak", { count: 0, lastDate: "" });
  useEffect(() => {
    const today = todayKey();
    if (streak.lastDate === today) return;
    if (!streak.lastDate) {
      setStreak({ count: 1, lastDate: today });
      return;
    }
    const diff = daysBetween(streak.lastDate, today);
    if (diff === 1) setStreak({ count: streak.count + 1, lastDate: today });
    else if (diff > 1) setStreak({ count: 1, lastDate: today });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return streak.count;
}

function Ring({ value, max, color, size = 62, label, sub, Icon }: {
  value: number; max: number; color: string; size?: number; label: string; sub: string; Icon: typeof Target;
}) {
  const pct = Math.min(1, value / Math.max(1, max));
  const r = size / 2 - 5;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} stroke={`${color}22`} strokeWidth={5} fill="none" />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            stroke={color} strokeWidth={5} fill="none"
            strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 500ms ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
          color, fontSize: 13, fontWeight: 800,
        }}>
          <Icon size={18} strokeWidth={2.4} />
        </div>
      </div>
      <div>
        <div style={{ fontSize: 10, color: C.textDimOnDark, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.15 }}>{sub}</div>
      </div>
    </div>
  );
}

export function DailyHeader({ vocabTotal = 5 }: { vocabTotal?: number }) {
  const streak = useDailyStreak();
  const [progress] = useLocalStorage<VocabProgress>("sub.vocab.learned", { date: "", learned: [] });
  const learnedToday = progress.date === todayKey() ? progress.learned.length : 0;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
      gap: 14,
      padding: "14px 18px",
      marginBottom: 18,
      background: "rgba(25,26,37,0.55)",
      border: `1px solid ${C.purple}33`,
      borderRadius: 14,
      backdropFilter: "blur(14px) saturate(160%)",
      WebkitBackdropFilter: "blur(14px) saturate(160%)",
      boxShadow: `0 8px 32px -12px ${C.purple}33`,
    }}>
      {/* Streak */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: 12,
          background: `linear-gradient(135deg, ${C.amber}, #ff5b3c)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: `0 6px 18px -4px ${C.amber}77`,
        }}>
          <Flame size={24} color="#fff" strokeWidth={2.4} fill="#fff3" />
        </div>
        <div>
          <div style={{ fontSize: 10, color: C.textDimOnDark, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Daily Streak</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.1 }}>
            {streak} <span style={{ fontSize: 12, color: C.textMutedOnDark, fontWeight: 500 }}>{streak === 1 ? "Tag" : "Tage"}</span>
          </div>
        </div>
      </div>

      {/* Vocab progress */}
      <Ring
        value={learnedToday}
        max={vocabTotal}
        color={C.purple}
        label="Vokabeln heute"
        sub={`${learnedToday} / ${vocabTotal}`}
        Icon={BookOpen}
      />

      {/* Learning goal (based on vocab + streak activity) */}
      <Ring
        value={learnedToday === vocabTotal ? 1 : learnedToday / vocabTotal}
        max={1}
        color={C.teal}
        label="Tagesziel"
        sub={learnedToday === vocabTotal ? "Erreicht ✓" : `${Math.round((learnedToday / vocabTotal) * 100)} %`}
        Icon={Target}
      />
    </div>
  );
}
