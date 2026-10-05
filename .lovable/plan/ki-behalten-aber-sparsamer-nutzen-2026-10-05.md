# KI behalten, aber sparsamer nutzen

Die KI bleibt in der App. Sie verbraucht aber weniger, damit das kostenlose Monatskontingent länger reicht. Wenn es aufgebraucht ist, zeigt die App einen freundlichen Hinweis statt einer Fehlermeldung. Alles andere funktioniert weiter wie bisher.

## Was sich ändert

1. **Daily Brief nur auf Knopfdruck**: Die 7 Vokabeln und das Finanzthema werden nicht mehr bei jedem Öffnen automatisch erzeugt. Du drückst „Heute laden“. Danach bleibt der Brief für den ganzen Tag gespeichert.
2. **Kürzere Antworten**: Die KI wird angewiesen, knapp zu antworten. Im Chat werden nur die letzten Nachrichten mitgeschickt statt des ganzen Verlaufs.
3. **Hinweis, wenn das Kontingent leer ist**: Ein kleiner Banner sagt „KI-Kontingent für diesen Monat aufgebraucht – alles andere funktioniert weiter“. Solange er sichtbar ist, sind die KI-Knöpfe ausgegraut. Erst ein erneuter Klick prüft wieder.
4. **Ohne KI nutzbar**: Noten, Klausuren, Themen, Mindmap, Fehler-Journal, Todos, Streak und Subby funktionieren komplett ohne KI.

## Technische Details

- `DailyBrief.tsx`: Der automatische `generate()`-Aufruf im `useEffect` entfällt. Stattdessen gibt es einen Button, wenn heute noch kein Brief existiert.
- `AiPanel.tsx`: Es werden nur die letzten 8 Nachrichten geschickt. Bei einem 402- oder 403-Fehler wird `sub.ai.paused` in localStorage gesetzt.
- `ai.functions.ts`: Status 402 und 403 werden als `{ code }` zurückgegeben. `max_tokens` wird auf einen sinnvollen Wert gesenkt. Im Prompt steht ein Hinweis auf kurze Antworten.
- Neuer kleiner Banner `AiQuotaBanner`: Er liest das Paused-Flag und blendet sich auf Dashboard und Klausur-Seite ein.
