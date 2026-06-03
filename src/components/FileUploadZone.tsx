import { useRef, useState } from "react";
import { C } from "@/lib/constants";
import { processFile } from "@/lib/helpers";
import type { FileBlock } from "@/lib/types";

type Props = {
  files: FileBlock[];
  onAdd: (files: FileBlock[]) => void;
  onRemove: (index: number) => void;
  label?: string;
};

export function FileUploadZone({ files, onAdd, onRemove, label }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  async function handle(raw: FileList | null) {
    if (!raw) return;
    const p = await Promise.all(Array.from(raw).map(processFile));
    onAdd(p);
  }

  return (
    <div style={{ marginBottom: 10 }}>
      {label && (
        <div style={{ fontSize: 10, color: C.textDim, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
          {label}
        </div>
      )}
      <div
        style={{
          background: dragging ? C.purpleDim : "#0f0f18",
          border: `1.5px dashed ${dragging ? C.purple : C.borderLight}`,
          borderRadius: 8,
          padding: "10px 14px",
          cursor: "pointer",
          textAlign: "center",
          transition: "all 0.15s",
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files);
        }}
        onClick={() => ref.current?.click()}
      >
        <input
          ref={ref}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={(e) => void handle(e.target.files)}
          accept=".pdf,.txt,.md,.png,.jpg,.jpeg,.csv"
        />
        <div style={{ fontSize: 11, color: C.textMuted }}>📎 Ablegen oder klicken · PDF, Bilder, Text</div>
      </div>
      {files.length > 0 && (
        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 5 }}>
          {files.map((f, i) => (
            <div
              key={i}
              style={{
                background: C.surfaceHigh,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: "3px 9px",
                fontSize: 11,
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <span style={{ color: C.purpleLight }}>📄</span>
              <span style={{ color: C.textMuted, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {f.name}
              </span>
              <button
                style={{ background: "none", border: "none", color: C.textDim, cursor: "pointer", fontSize: 12, padding: 0 }}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(i);
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
