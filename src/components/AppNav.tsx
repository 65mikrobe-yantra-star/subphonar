import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, GraduationCap, CalendarClock, CheckSquare } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { C } from "@/lib/constants";
import type { CSSProperties } from "react";
import { MonsterHead } from "./MonsterHead";


const TABS = [
  { to: "/", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/noten", label: "Noten", Icon: GraduationCap },
  { to: "/klausuren", label: "Klausuren", Icon: CalendarClock },
  { to: "/todos", label: "Todos", Icon: CheckSquare },
] as const;

const navStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 4,
  padding: "10px 20px",
  borderBottom: `1px solid ${C.purple}22`,
  background: "rgba(15,16,24,0.55)",
  backdropFilter: "blur(18px) saturate(160%)",
  position: "sticky",
  top: 0,
  zIndex: 100,
};

export function AppNav() {
  const loc = useLocation();
  return (
    <nav style={navStyle} className="app-nav">
      <span
        style={{
          fontSize: 15,
          fontWeight: 800,
          background: `linear-gradient(135deg, ${C.purpleLight}, ${C.amber})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          marginRight: 14,
          letterSpacing: "0.08em",
        }}
      >
        ✦ {APP_NAME.toUpperCase()}
      </span>
      {TABS.map(({ to, label, Icon }) => {
        const active = loc.pathname === to || (to !== "/" && loc.pathname.startsWith(to));
        return (
          <Link
            key={to}
            to={to}
            title={label}
            data-inactive={!active}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              padding: "7px 12px",
              borderRadius: 10,
              fontSize: 12.5,
              fontWeight: 500,
              textDecoration: "none",
              color: active ? "#fff" : C.textMutedOnDark,
              background: active ? `${C.purple}33` : "transparent",
              border: `1px solid ${active ? C.purple + "66" : "transparent"}`,
              transition: "all 160ms ease",
            }}
          >
            <Icon size={15} strokeWidth={2.1} />
            <span>{label}</span>
          </Link>
        );
      })}
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <MonsterHead />
      </div>
    </nav>
  );
}

