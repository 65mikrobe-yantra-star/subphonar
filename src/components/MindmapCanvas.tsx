import { useEffect, useRef, useState } from "react";
import type { MindmapStroke } from "@/lib/types";

type Props = {
  strokes: MindmapStroke[];
  onChange: (s: MindmapStroke[]) => void;
  height?: number;
};

const COLORS = ["#1a1a2a", "#7F77DD", "#1D9E75", "#EF9F27", "#A32D2D"];
type Tool = "draw" | "text" | "eraser";

export function MindmapCanvas({ strokes, onChange, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2.5);
  const [tool, setTool] = useState<Tool>("draw");
  const [fontSize, setFontSize] = useState(18);
  const drawingRef = useRef<MindmapStroke | null>(null);
  const [w, setW] = useState(800);

  useEffect(() => {
    function update() {
      if (containerRef.current) setW(containerRef.current.clientWidth);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = w * dpr;
    c.height = height * dpr;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, height, strokes]);

  function redraw() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    // Weiches Papier
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, "#fefdf9");
    grad.addColorStop(1, "#f6f3ea");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, height);
    // Punkt-Raster (subtiler & moderner als Linien)
    ctx.fillStyle = "#d9d3c0";
    for (let x = 16; x < w; x += 22) {
      for (let y = 16; y < height; y += 22) {
        ctx.beginPath();
        ctx.arc(x, y, 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Starthinweis
    if (strokes.length === 0) {
      ctx.fillStyle = "#b9b09a";
      ctx.font = "italic 16px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Hier starten – zeichne dein erstes Konzept ✎", w / 2, height / 2 - 8);
      ctx.font = "12px 'Inter', sans-serif";
      ctx.fillStyle = "#c5bda8";
      ctx.fillText("Doppelklick, um Text einzufügen", w / 2, height / 2 + 14);
      ctx.textAlign = "start";
    }
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (drawingRef.current) drawStroke(ctx, drawingRef.current);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: MindmapStroke) {
    if (s.text) {
      ctx.fillStyle = s.color;
      ctx.font = `600 ${s.fontSize ?? 18}px 'Inter', sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(s.text, s.points[0], s.points[1]);
      ctx.textBaseline = "alphabetic";
      return;
    }
    if (s.points.length < 2) return;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s.points[0], s.points[1]);
    for (let i = 2; i < s.points.length; i += 2) ctx.lineTo(s.points[i], s.points[i + 1]);
    ctx.stroke();
  }

  function getPos(e: React.PointerEvent | React.MouseEvent) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent) {
    if (tool === "text") return;
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
    if (tool === "eraser") {
      // Lösche den letzten Stroke, dessen erster Punkt in ~30px Umkreis liegt
      const idx = [...strokes].reverse().findIndex((st) => {
        const dx = st.points[0] - x;
        const dy = st.points[1] - y;
        return Math.hypot(dx, dy) < 30;
      });
      if (idx >= 0) {
        const real = strokes.length - 1 - idx;
        onChange(strokes.filter((_, i) => i !== real));
      }
      return;
    }
    drawingRef.current = { color, width, points: [x, y] };
  }
  function move(e: React.PointerEvent) {
    if (!drawingRef.current) return;
    const { x, y } = getPos(e);
    drawingRef.current.points.push(x, y);
    redraw();
  }
  function end() {
    if (!drawingRef.current) return;
    onChange([...strokes, drawingRef.current]);
    drawingRef.current = null;
  }

  function handleDouble(e: React.MouseEvent) {
    const { x, y } = getPos(e);
    const txt = window.prompt("Text eingeben:");
    if (!txt) return;
    onChange([...strokes, { color, width: 1, points: [x, y], text: txt, fontSize }]);
  }

  const toolBtn = (t: Tool, label: string, icon: string) => (
    <button
      onClick={() => setTool(t)}
      style={{
        padding: "6px 12px",
        fontSize: 12,
        borderRadius: 10,
        border: tool === t ? "1px solid #7F77DD" : "1px solid #d9d6c4",
        background: tool === t ? "#7F77DD18" : "#ffffffaa",
        color: tool === t ? "#5c53c7" : "#4a4a5c",
        cursor: "pointer",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <span>{icon}</span> {label}
    </button>
  );

  return (
    <div ref={containerRef}>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 10,
          alignItems: "center",
          flexWrap: "wrap",
          background: "#ffffffcc",
          border: "1px solid #e8e4d3",
          padding: "8px 10px",
          borderRadius: 12,
          backdropFilter: "blur(8px)",
        }}
      >
        {toolBtn("draw", "Zeichnen", "✎")}
        {toolBtn("text", "Text", "T")}
        {toolBtn("eraser", "Radierer", "⌫")}
        <div style={{ width: 1, height: 20, background: "#e0dcc8", margin: "0 4px" }} />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid #7F77DD" : "1px solid #ccc",
              cursor: "pointer",
              boxShadow: color === c ? "0 0 0 3px #7F77DD22" : "none",
            }}
          />
        ))}
        {tool === "draw" && (
          <>
            <input
              type="range"
              min={1}
              max={10}
              step={0.5}
              value={width}
              onChange={(e) => setWidth(parseFloat(e.target.value))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, color: "#888", minWidth: 32 }}>{width.toFixed(1)}px</span>
          </>
        )}
        {tool === "text" && (
          <>
            <input
              type="range"
              min={12}
              max={40}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
              style={{ width: 80 }}
            />
            <span style={{ fontSize: 11, color: "#888", minWidth: 32 }}>{fontSize}px</span>
          </>
        )}
        <button
          onClick={() => onChange(strokes.slice(0, -1))}
          style={{ marginLeft: "auto", padding: "5px 12px", fontSize: 11, borderRadius: 8, border: "1px solid #d0ccb8", background: "#fff", cursor: "pointer" }}
        >
          ↶ Rückgängig
        </button>
        <button
          onClick={() => { if (confirm("Ganze Mindmap leeren?")) onChange([]); }}
          style={{ padding: "5px 12px", fontSize: 11, borderRadius: 8, border: "1px solid #A32D2D55", background: "#A32D2D11", color: "#A32D2D", cursor: "pointer" }}
        >
          Leeren
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: w,
          height,
          borderRadius: 14,
          border: "1px solid #e0dbc4",
          background: "#fdfdf7",
          touchAction: "none",
          cursor: tool === "text" ? "text" : tool === "eraser" ? "cell" : "crosshair",
          display: "block",
          boxShadow: "inset 0 1px 0 #ffffff, 0 1px 3px rgba(0,0,0,0.04)",
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={handleDouble}
        onClick={(e) => {
          if (tool !== "text") return;
          const { x, y } = getPos(e);
          const txt = window.prompt("Text eingeben:");
          if (!txt) return;
          onChange([...strokes, { color, width: 1, points: [x, y], text: txt, fontSize }]);
        }}
      />
      <div style={{ marginTop: 6, fontSize: 11, color: "#8a8266" }}>
        Tipp: Doppelklick oder Text-Modus → Text platzieren. Radierer entfernt einzelne Elemente.
      </div>
    </div>
  );
}
