import { useEffect, useRef, useState } from "react";
import type { MindmapStroke } from "@/lib/types";

type Props = {
  strokes: MindmapStroke[];
  onChange: (s: MindmapStroke[]) => void;
  height?: number;
};

const COLORS = ["#1a1a2a", "#7F77DD", "#1D9E75", "#EF9F27", "#A32D2D"];

export function MindmapCanvas({ strokes, onChange, height = 480 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(2.5);
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
    ctx.fillStyle = "#fdfdf7";
    ctx.fillRect(0, 0, c.width, c.height);
    // light grid
    ctx.strokeStyle = "#e8e6da";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < w; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (const stroke of strokes) drawStroke(ctx, stroke);
    if (drawingRef.current) drawStroke(ctx, drawingRef.current);
  }

  function drawStroke(ctx: CanvasRenderingContext2D, s: MindmapStroke) {
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

  function getPos(e: React.PointerEvent) {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const r = c.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function start(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    const { x, y } = getPos(e);
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

  return (
    <div ref={containerRef}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center", flexWrap: "wrap" }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: c,
              border: color === c ? "2px solid #7F77DD" : "1px solid #ccc",
              cursor: "pointer",
            }}
          />
        ))}
        <input
          type="range"
          min={1}
          max={10}
          step={0.5}
          value={width}
          onChange={(e) => setWidth(parseFloat(e.target.value))}
          style={{ width: 90 }}
        />
        <span style={{ fontSize: 11, color: "#888" }}>{width.toFixed(1)}px</span>
        <button
          onClick={() => onChange(strokes.slice(0, -1))}
          style={{ marginLeft: "auto", padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #ccc", background: "#fff", cursor: "pointer" }}
        >
          ↶ Rückgängig
        </button>
        <button
          onClick={() => onChange([])}
          style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #A32D2D55", background: "#A32D2D11", color: "#A32D2D", cursor: "pointer" }}
        >
          Leeren
        </button>
      </div>
      <canvas
        ref={canvasRef}
        style={{
          width: w,
          height,
          borderRadius: 10,
          border: "1px solid #d9d6c4",
          background: "#fdfdf7",
          touchAction: "none",
          cursor: "crosshair",
          display: "block",
        }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
    </div>
  );
}
