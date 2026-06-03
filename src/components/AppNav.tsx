import { Link, useLocation } from "@tanstack/react-router";
import { APP_NAME } from "@/lib/constants";
import { s } from "@/lib/ui-styles";

const TABS = [
  { to: "/", label: "Dashboard" },
  { to: "/noten", label: "Noten" },
  { to: "/klausuren", label: "Klausuren" },
  { to: "/todos", label: "Todos" },
] as const;

export function AppNav() {
  const loc = useLocation();
  return (
    <nav style={s.nav}>
      <span style={s.logo}>✦ {APP_NAME.toUpperCase()}</span>
      {TABS.map((t) => {
        const active = loc.pathname === t.to || (t.to !== "/" && loc.pathname.startsWith(t.to));
        return (
          <Link key={t.to} to={t.to} style={s.navBtn(active)}>
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
