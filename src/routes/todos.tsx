import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppNav } from "@/components/AppNav";
import { AiPanel } from "@/components/AiPanel";
import { APP_NAME, C, PRIORITY_COLORS, STATUS_COLUMNS } from "@/lib/constants";
import { s } from "@/lib/ui-styles";
import { useLocalStorage } from "@/lib/storage";
import { formatDate, isOverdue } from "@/lib/helpers";
import { chat } from "@/lib/ai.functions";
import type { Klausur, Prioritaet, Todo } from "@/lib/types";

export const Route = createFileRoute("/todos")({
  head: () => ({
    meta: [
      { title: `Todos — ${APP_NAME}` },
      { name: "description", content: "Aufgaben und Lernziele in einem Kanban-Board organisieren." },
    ],
  }),
  component: TodosPage,
});

function TodosPage() {
  const [todos, setTodos] = useLocalStorage<Todo[]>("sub.todos", []);
  const [klausuren] = useLocalStorage<Klausur[]>("sub.klausuren", []);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState<Omit<Todo, "id" | "status">>({
    title: "",
    notes: "",
    prioritaet: "mittel",
    due: "",
    klausurId: undefined,
  });

  function create() {
    if (!draft.title.trim()) return;
    setTodos([{ id: Date.now(), status: "todo", ...draft }, ...todos]);
    setDraft({ title: "", notes: "", prioritaet: "mittel", due: "", klausurId: undefined });
    setShowNew(false);
  }
  function move(id: number, status: Todo["status"]) {
    setTodos(todos.map((t) => (t.id === id ? { ...t, status } : t)));
  }
  function remove(id: number) {
    setTodos(todos.filter((t) => t.id !== id));
  }

  return (
    <div style={s.app}>
      <AppNav />
      <div style={s.main(false)}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 20 }}>
          <div style={s.sectionTitle}>✓ Todos</div>
          <button
            style={{ ...s.smallBtn(C.purple), padding: "6px 14px", fontSize: 12, marginLeft: "auto" }}
            onClick={() => setShowNew(true)}
          >
            + Neue Aufgabe
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
          {STATUS_COLUMNS.map((col) => {
            const list = todos.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                style={{ background: C.surface, border: `1px solid ${col.color}33`, borderRadius: 12, padding: 14, minHeight: 200 }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  <span style={{ color: col.color, fontSize: 16 }}>{col.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: col.color, flex: 1 }}>{col.label}</span>
                  <span style={{ fontSize: 11, color: C.textMuted }}>{list.length}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {list.length === 0 && <div style={{ fontSize: 11, color: C.textDim, textAlign: "center", padding: 14 }}>—</div>}
                  {list.map((t) => {
                    const pc = PRIORITY_COLORS[t.prioritaet];
                    const overdue = isOverdue(t.due);
                    const linkedKlausur = klausuren.find((k) => k.id === t.klausurId);
                    return (
                      <div
                        key={t.id}
                        style={{
                          background: C.surfaceHigh,
                          border: `1px solid ${overdue ? C.red + "55" : C.border}`,
                          borderRadius: 8,
                          padding: 10,
                        }}
                      >
                        <div style={{ display: "flex", gap: 6, marginBottom: 6, alignItems: "flex-start" }}>
                          <span style={{ ...s.pill(pc.bg, pc.text), fontSize: 9 }}>{pc.label}</span>
                          {linkedKlausur && (
                            <span style={{ ...s.pill(C.purpleDim, C.purpleLight), fontSize: 9 }}>{linkedKlausur.title}</span>
                          )}
                          <button style={{ marginLeft: "auto", ...s.smallBtn(C.red), padding: "1px 6px" }} onClick={() => remove(t.id)}>
                            ✕
                          </button>
                        </div>
                        <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 4 }}>{t.title}</div>
                        {t.notes && <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 5 }}>{t.notes}</div>}
                        {t.due && (
                          <div style={{ fontSize: 10, color: overdue ? "#F09595" : C.textDim, marginBottom: 6 }}>
                            📅 {formatDate(t.due)} {overdue && "(überfällig)"}
                          </div>
                        )}
                        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                          {STATUS_COLUMNS.filter((c) => c.id !== t.status).map((c) => (
                            <button
                              key={c.id}
                              style={{ ...s.smallBtn(c.color), padding: "2px 8px", fontSize: 10 }}
                              onClick={() => move(t.id, c.id)}
                            >
                              → {c.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {showNew && (
          <div
            style={s.modal}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowNew(false);
            }}
          >
            <div style={s.modalBox(420)}>
              <div style={s.modalTitle}>Neue Aufgabe</div>
              <input
                style={s.inp}
                placeholder="Titel"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                autoFocus
              />
              <textarea
                style={s.ta}
                placeholder="Notizen / Details"
                value={draft.notes}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              />
              <select
                style={s.sel}
                value={draft.prioritaet}
                onChange={(e) => setDraft({ ...draft, prioritaet: e.target.value as Prioritaet })}
              >
                <option value="hoch">Priorität: Hoch</option>
                <option value="mittel">Priorität: Mittel</option>
                <option value="niedrig">Priorität: Niedrig</option>
              </select>
              <input style={s.inp} type="date" value={draft.due} onChange={(e) => setDraft({ ...draft, due: e.target.value })} />
              <select
                style={s.sel}
                value={draft.klausurId ?? ""}
                onChange={(e) => setDraft({ ...draft, klausurId: e.target.value ? Number(e.target.value) : undefined })}
              >
                <option value="">Keine Klausur verknüpfen</option>
                {klausuren.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.title}
                  </option>
                ))}
              </select>
              <button style={s.btnP} onClick={create}>
                Aufgabe anlegen
              </button>
              <div style={{ height: 8 }} />
              <button style={s.btnS} onClick={() => setShowNew(false)}>
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
