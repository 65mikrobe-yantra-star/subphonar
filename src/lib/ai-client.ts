import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chat } from "@/lib/ai.functions";

const KEY = "sub.ai.paused";
const EVT = "sub-ai-paused";

function setPaused(v: boolean) {
  if (typeof window === "undefined") return;
  if (v) window.localStorage.setItem(KEY, "1");
  else window.localStorage.removeItem(KEY);
  window.dispatchEvent(new Event(EVT));
}

export function useAiPaused() {
  const [paused, set] = useState(false);
  useEffect(() => {
    const read = () => set(window.localStorage.getItem(KEY) === "1");
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  return paused;
}

type ChatArgs = Parameters<ReturnType<typeof useServerFn<typeof chat>>>[0];

/** KI-Aufruf mit Kontingent-Erkennung: Bei leerem Kontingent erscheint ein Hinweis-Banner. */
export function useChat() {
  const fn = useServerFn(chat);
  return async (args: ChatArgs) => {
    const res = await fn(args);
    if (res.code === 402 || res.code === 403) setPaused(true);
    else if (!res.error) setPaused(false);
    return res;
  };
}
