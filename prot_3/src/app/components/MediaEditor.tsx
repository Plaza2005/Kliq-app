import { useState, useRef, useCallback, useEffect } from "react";
import { X, Type, Sliders, Scissors, Crop, Trash2 } from "lucide-react";

export interface TextOverlay {
  id: string;
  text: string;
  x: number;   // 0–100 % of container
  y: number;   // 0–100 % of container
  color: string;
  fontSize: number;
  bold: boolean;
  bg: boolean;
}

export interface MediaEditorResult {
  file: File;
  previewUrl: string;
  filter: string;
  textOverlays: TextOverlay[];
  trim: { start: number; end: number } | null;
}

const FILTERS = [
  { name: "Normal",  css: "" },
  { name: "Bright",  css: "brightness(1.35) contrast(1.05)" },
  { name: "Warm",    css: "sepia(0.25) saturate(1.5) brightness(1.05)" },
  { name: "Cool",    css: "hue-rotate(25deg) saturate(1.2) brightness(1.05)" },
  { name: "Fade",    css: "brightness(1.1) contrast(0.82) saturate(0.75)" },
  { name: "Vivid",   css: "saturate(1.9) contrast(1.1)" },
  { name: "Dark",    css: "brightness(0.75) contrast(1.2)" },
  { name: "B&W",     css: "grayscale(1) contrast(1.1)" },
];

const ASPECT_RATIOS: { label: string; value: string; ratio: number | null }[] = [
  { label: "Original", value: "original", ratio: null },
  { label: "1:1",      value: "1:1",      ratio: 1 },
  { label: "9:16",     value: "9:16",     ratio: 9 / 16 },
  { label: "4:5",      value: "4:5",      ratio: 4 / 5 },
  { label: "16:9",     value: "16:9",     ratio: 16 / 9 },
];

const TEXT_COLORS = ["#ffffff", "#000000", "#ff3366", "#ffcc00", "#00ccff", "#ff6600", "#00ee77", "#cc00ff"];

type Tool = "text" | "filter" | "trim" | "crop" | null;

interface Props {
  file: File;
  previewUrl: string;
  onSave: (result: MediaEditorResult) => void;
  onClose: () => void;
}

export function MediaEditor({ file, previewUrl, onSave, onClose }: Props) {
  const isVideo = file.type.startsWith("video");
  const containerRef  = useRef<HTMLDivElement>(null);
  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);

  const [activeTool, setActiveTool] = useState<Tool>(null);

  // Filter
  const [filter, setFilter] = useState("");

  // Text overlays
  const [overlays, setOverlays]       = useState<TextOverlay[]>([]);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [draggingId, setDraggingId]   = useState<string | null>(null);
  const [overDelete, setOverDelete]   = useState(false);
  const [placingText, setPlacingText] = useState(false);
  const [pendingPos, setPendingPos]   = useState<{ x: number; y: number } | null>(null);
  const [editText, setEditText]       = useState("");
  const [editColor, setEditColor]     = useState("#ffffff");
  const [editSize, setEditSize]       = useState(28);
  const [editBold, setEditBold]       = useState(false);
  const [editBg, setEditBg]           = useState(false);

  // Video trim (stored as 0–100 percentages)
  const [videoDur, setVideoDur]   = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd]     = useState(100);

  // Image crop
  const [cropAspect, setCropAspect] = useState("original");

  // Drag — moved flag distinguishes tap (< 5 px) from actual drag
  const dragRef = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);

  // Keep video looping within trim range
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !videoDur) return;
    const handler = () => {
      const endSec = (trimEnd / 100) * videoDur;
      const startSec = (trimStart / 100) * videoDur;
      if (v.currentTime >= endSec) v.currentTime = startSec;
    };
    v.addEventListener("timeupdate", handler);
    return () => v.removeEventListener("timeupdate", handler);
  }, [videoDur, trimStart, trimEnd]);

  const toggleTool = (t: Tool) => setActiveTool(prev => (prev === t ? null : t));

  const handleMediaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (activeTool === "text" && placingText && !pendingPos) {
      setPendingPos({ x, y });
    } else {
      setSelectedId(null);
      setEditingId(null);
    }
  };

  const confirmText = () => {
    if (!editText.trim()) return;
    if (editingId) {
      setOverlays(prev => prev.map(o => o.id === editingId
        ? { ...o, text: editText, color: editColor, fontSize: editSize, bold: editBold, bg: editBg }
        : o
      ));
      setEditingId(null);
      setEditText("");
    } else if (pendingPos) {
      const id = Date.now().toString();
      setOverlays(prev => [...prev, {
        id, text: editText, x: pendingPos.x, y: pendingPos.y,
        color: editColor, fontSize: editSize, bold: editBold, bg: editBg,
      }]);
      setEditText("");
      setPendingPos(null);
      setPlacingText(false);
      setSelectedId(id);
    }
  };

  const deleteSelected = () => {
    setOverlays(prev => prev.filter(o => o.id !== selectedId));
    setSelectedId(null);
  };

  // Pointer drag handlers on overlays
  const startDrag = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const o = overlays.find(x => x.id === id);
    if (!o) return;
    dragRef.current = { id, sx: e.clientX, sy: e.clientY, ox: o.x, oy: o.y, moved: false };
    setSelectedId(id);
    setDraggingId(id);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !containerRef.current) return;
    const rawDx = e.clientX - dragRef.current.sx;
    const rawDy = e.clientY - dragRef.current.sy;
    if (!dragRef.current.moved && Math.sqrt(rawDx * rawDx + rawDy * rawDy) > 5) {
      dragRef.current.moved = true;
    }
    if (!dragRef.current.moved) return;
    const rect = containerRef.current.getBoundingClientRect();
    const relY = (e.clientY - rect.top) / rect.height;
    setOverDelete(relY > 0.75);
    const dx = (rawDx / rect.width) * 100;
    const dy = (rawDy / rect.height) * 100;
    const nx = Math.max(2, Math.min(98, dragRef.current.ox + dx));
    const ny = Math.max(2, Math.min(98, dragRef.current.oy + dy));
    const id = dragRef.current.id;
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, x: nx, y: ny } : o));
  };

  const onPointerUp = () => {
    if (dragRef.current?.moved && overDelete) {
      const id = dragRef.current.id;
      setOverlays(prev => prev.filter(o => o.id !== id));
      setSelectedId(null);
    }
    setDraggingId(null);
    setOverDelete(false);
    dragRef.current = null;
  };

  const openEditOverlay = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const overlay = overlays.find(o => o.id === id);
    if (!overlay) return;
    setEditingId(overlay.id);
    setEditText(overlay.text);
    setEditColor(overlay.color);
    setEditSize(overlay.fontSize);
    setEditBold(overlay.bold);
    setEditBg(overlay.bg);
    setActiveTool("text");
    setPendingPos(null);
    setPlacingText(false);
  };

  // Composite image on canvas for image posts
  const buildComposite = useCallback(async (): Promise<{ file: File; url: string }> => {
    const img = new Image();
    img.src = previewUrl;
    await new Promise<void>(res => { img.onload = () => res(); });

    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;

    // Determine crop dimensions
    const ar = ASPECT_RATIOS.find(a => a.value === cropAspect);
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (ar?.ratio) {
      const imgRatio = img.width / img.height;
      if (imgRatio > ar.ratio) {
        sw = img.height * ar.ratio;
        sx = (img.width - sw) / 2;
      } else {
        sh = img.width / ar.ratio;
        sy = (img.height - sh) / 2;
      }
    }

    c.width = sw;
    c.height = sh;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    // Draw text overlays
    overlays.forEach(ov => {
      const px = (ov.x / 100) * sw;
      const py = (ov.y / 100) * sh;
      const sz = (ov.fontSize / 375) * sw;
      ctx.font = `${ov.bold ? "bold " : ""}${sz}px sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      if (ov.bg) {
        const m = ctx.measureText(ov.text);
        const pad = sz * 0.3;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(px - m.width / 2 - pad, py - sz / 2 - pad, m.width + pad * 2, sz + pad * 2);
      }
      ctx.fillStyle = ov.color;
      ctx.shadowColor = ov.bg ? "transparent" : "rgba(0,0,0,0.8)";
      ctx.shadowBlur = ov.bg ? 0 : 4;
      ctx.fillText(ov.text, px, py);
      ctx.shadowBlur = 0;
    });

    return new Promise(res => {
      c.toBlob(blob => {
        if (!blob) return;
        const newFile = new File([blob], file.name, { type: "image/jpeg" });
        res({ file: newFile, url: URL.createObjectURL(newFile) });
      }, "image/jpeg", 0.92);
    });
  }, [previewUrl, overlays, cropAspect, file]);

  const handleSave = async () => {
    if (!isVideo && (overlays.length > 0 || cropAspect !== "original")) {
      const { file: f, url } = await buildComposite();
      onSave({ file: f, previewUrl: url, filter, textOverlays: [], trim: null });
    } else {
      onSave({
        file, previewUrl, filter, textOverlays: overlays,
        trim: videoDur > 0 && (trimStart > 0 || trimEnd < 100)
          ? { start: (trimStart / 100) * videoDur, end: (trimEnd / 100) * videoDur }
          : null,
      });
    }
  };

  const fmtTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  // Visual crop style for image preview
  const cropStyle = (): React.CSSProperties => {
    const ar = ASPECT_RATIOS.find(a => a.value === cropAspect);
    if (!ar?.ratio) return {};
    return { aspectRatio: String(ar.ratio), objectFit: "cover", maxHeight: "100%", maxWidth: "100%" };
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-800 transition">
          <X size={20} />
        </button>
        <span className="text-white font-bold text-sm">Edit</span>
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-5 py-2 rounded-xl text-sm hover:opacity-90 transition">
          Done
        </button>
      </div>

      {/* Media preview */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center bg-black"
        onClick={handleMediaClick}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {isVideo ? (
          <video
            ref={videoRef}
            src={previewUrl}
            className="max-w-full max-h-full object-contain"
            style={{ filter }}
            autoPlay loop muted playsInline
            onLoadedMetadata={e => {
              setVideoDur(e.currentTarget.duration);
              setTrimEnd(100);
            }}
          />
        ) : (
          <img
            src={previewUrl}
            alt="Edit"
            className="object-cover"
            style={{ filter, ...cropStyle() }}
          />
        )}

        {/* Text overlays */}
        {overlays.map(ov => (
          <div
            key={ov.id}
            className="absolute cursor-grab active:cursor-grabbing touch-none"
            style={{ left: `${ov.x}%`, top: `${ov.y}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
            onPointerDown={e => startDrag(e, ov.id)}
            onDoubleClick={e => openEditOverlay(e, ov.id)}
          >
            <span
              className={`block px-2 py-0.5 rounded whitespace-nowrap ${ov.id === selectedId ? "ring-2 ring-white ring-offset-1 ring-offset-black" : ""}`}
              style={{
                color: ov.color,
                fontSize: ov.fontSize,
                fontWeight: ov.bold ? "bold" : "normal",
                background: ov.bg ? "rgba(0,0,0,0.6)" : "transparent",
                textShadow: ov.bg ? "none" : "0 1px 4px rgba(0,0,0,0.9)",
              }}
            >
              {ov.text}
            </span>
          </div>
        ))}

        {/* Tap-to-place hint */}
        {activeTool === "text" && placingText && !pendingPos && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black/60 text-white text-sm font-semibold px-5 py-2.5 rounded-full backdrop-blur-sm border border-white/20">
              Tap to place text
            </div>
          </div>
        )}

        {/* Delete button for selected overlay (when not dragging) */}
        {selectedId && !draggingId && (
          <button
            onClick={e => { e.stopPropagation(); deleteSelected(); }}
            className="absolute top-3 right-3 z-20 w-10 h-10 bg-red-600/80 backdrop-blur-sm rounded-full flex items-center justify-center border border-red-500/40 hover:bg-red-600 transition"
          >
            <Trash2 size={16} className="text-white" />
          </button>
        )}

        {/* Drag-to-delete zone */}
        {draggingId && (
          <div className={`absolute bottom-0 inset-x-0 h-24 flex flex-col items-center justify-center gap-1.5 pointer-events-none z-20 transition-all duration-150 ${
            overDelete ? "bg-red-600/80 backdrop-blur-sm" : "bg-black/50 backdrop-blur-sm"
          }`}>
            <Trash2 size={overDelete ? 34 : 26} className={`transition-all duration-150 ${overDelete ? "text-white" : "text-gray-400"}`} />
            <span className={`text-xs font-semibold transition-all duration-150 ${overDelete ? "text-white" : "text-gray-500"}`}>
              {overDelete ? "Release to delete" : "Drag here to delete"}
            </span>
          </div>
        )}
      </div>

      {/* Tool panels + toolbar */}
      <div className="flex-shrink-0 bg-gray-950 border-t border-gray-800">

        {/* TEXT PANEL */}
        {activeTool === "text" && (
          <div className="p-4 border-b border-gray-800 space-y-3">
            {(pendingPos || editingId) ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  {editingId && <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Editing text</span>}
                </div>
                <input
                  autoFocus
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && confirmText()}
                  placeholder="Type something..."
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-base placeholder-gray-600 focus:outline-none focus:border-purple-600 transition"
                />
                <div className="flex items-center gap-3">
                  <div className="flex gap-2 flex-1 overflow-x-auto">
                    {TEXT_COLORS.map(c => (
                      <button key={c} onClick={() => setEditColor(c)}
                        className={`w-7 h-7 rounded-full flex-shrink-0 border-2 transition-transform ${editColor === c ? "border-white scale-125" : "border-transparent"}`}
                        style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <button onClick={() => setEditBold(b => !b)}
                    className={`w-9 h-9 rounded-lg border transition font-black text-base ${editBold ? "bg-white text-black border-white" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                    B
                  </button>
                  <button onClick={() => setEditBg(b => !b)}
                    className={`px-2 h-9 rounded-lg border text-xs font-semibold transition ${editBg ? "bg-gray-700 border-gray-500 text-white" : "border-gray-700 text-gray-500 hover:border-gray-500"}`}>
                    BG
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs w-10">Size</span>
                  <input type="range" min="16" max="72" value={editSize} onChange={e => setEditSize(Number(e.target.value))}
                    className="flex-1 accent-purple-600" />
                  <span className="text-gray-400 text-xs w-6 text-right">{editSize}</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => {
                    if (editingId) { setEditingId(null); setEditText(""); }
                    else { setPendingPos(null); setPlacingText(false); setEditText(""); }
                  }}
                    className="flex-1 border border-gray-700 text-gray-400 py-2.5 rounded-xl text-sm hover:border-gray-500 transition">
                    Cancel
                  </button>
                  <button onClick={confirmText} disabled={!editText.trim()}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm transition">
                    {editingId ? "Update" : "Add"}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => { setPlacingText(true); setSelectedId(null); setEditingId(null); }}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 rounded-xl text-sm transition">
                  + Add Text
                </button>
                {selectedId && (
                  <button onClick={deleteSelected}
                    className="px-4 py-2.5 bg-red-900/30 border border-red-700/50 text-red-400 rounded-xl text-sm hover:bg-red-900/50 transition">
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* FILTER PANEL */}
        {activeTool === "filter" && (
          <div className="py-3 border-b border-gray-800">
            <div className="flex gap-3 overflow-x-auto px-4 pb-1">
              {FILTERS.map(f => (
                <button key={f.name} onClick={() => setFilter(f.css)} className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <div className={`w-16 h-20 rounded-xl overflow-hidden border-2 transition ${filter === f.css ? "border-purple-500" : "border-gray-700"}`}>
                    {isVideo ? (
                      <video src={previewUrl} muted loop autoPlay playsInline className="w-full h-full object-cover" style={{ filter: f.css }} />
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-cover" style={{ filter: f.css }} alt={f.name} />
                    )}
                  </div>
                  <span className={`text-[10px] font-medium ${filter === f.css ? "text-purple-400" : "text-gray-500"}`}>{f.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TRIM PANEL (video only) */}
        {activeTool === "trim" && isVideo && (
          <div className="p-4 border-b border-gray-800 space-y-4">
            <div className="flex justify-between text-xs text-gray-400">
              <span>Start · {fmtTime((trimStart / 100) * videoDur)}</span>
              <span className="text-purple-400 font-semibold">{fmtTime(((trimEnd - trimStart) / 100) * videoDur)}</span>
              <span>End · {fmtTime((trimEnd / 100) * videoDur)}</span>
            </div>

            {/* Combined visual trim bar */}
            <div className="relative h-12 rounded-xl overflow-hidden bg-gray-800">
              {/* Video thumbnail strip */}
              <video src={previewUrl} className="absolute inset-0 w-full h-full object-cover opacity-30" muted />
              {/* Dimmed outside regions */}
              <div className="absolute top-0 left-0 h-full bg-black/60" style={{ width: `${trimStart}%` }} />
              <div className="absolute top-0 right-0 h-full bg-black/60" style={{ width: `${100 - trimEnd}%` }} />
              {/* Selected region border */}
              <div className="absolute top-0 h-full border-2 border-purple-500 rounded-sm"
                style={{ left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }} />
              {/* Start handle */}
              <div className="absolute top-0 w-3 h-full bg-purple-500 rounded-l cursor-ew-resize"
                style={{ left: `${trimStart}%`, transform: "translateX(-50%)" }} />
              {/* End handle */}
              <div className="absolute top-0 w-3 h-full bg-purple-500 rounded-r cursor-ew-resize"
                style={{ left: `${trimEnd}%`, transform: "translateX(-50%)" }} />
            </div>

            {/* Start slider */}
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs w-10">Start</span>
              <input type="range" min="0" max={trimEnd - 1} value={trimStart}
                onChange={e => {
                  const v = Number(e.target.value);
                  setTrimStart(v);
                  if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoDur;
                }}
                className="flex-1 accent-purple-500" />
              <span className="text-gray-400 text-xs w-10 text-right">{fmtTime((trimStart / 100) * videoDur)}</span>
            </div>

            {/* End slider */}
            <div className="flex items-center gap-3">
              <span className="text-gray-500 text-xs w-10">End</span>
              <input type="range" min={trimStart + 1} max="100" value={trimEnd}
                onChange={e => {
                  const v = Number(e.target.value);
                  setTrimEnd(v);
                  if (videoRef.current) videoRef.current.currentTime = (v / 100) * videoDur;
                }}
                className="flex-1 accent-purple-500" />
              <span className="text-gray-400 text-xs w-10 text-right">{fmtTime((trimEnd / 100) * videoDur)}</span>
            </div>
          </div>
        )}

        {/* CROP PANEL (image only) */}
        {activeTool === "crop" && !isVideo && (
          <div className="p-4 border-b border-gray-800">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-3">Aspect Ratio</p>
            <div className="flex gap-2">
              {ASPECT_RATIOS.map(ar => (
                <button key={ar.value} onClick={() => setCropAspect(ar.value)}
                  className={`flex-1 py-2.5 text-xs font-semibold rounded-xl border transition ${cropAspect === ar.value ? "border-purple-500 bg-purple-600/20 text-white" : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300"}`}>
                  {ar.label}
                </button>
              ))}
            </div>
            <p className="text-gray-600 text-xs text-center mt-3">Crop is applied on save</p>
          </div>
        )}

        {/* Main toolbar */}
        <div className="flex items-center justify-around px-6 py-3">
          <button onClick={() => toggleTool("text")}
            className={`flex flex-col items-center gap-1 transition ${activeTool === "text" ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}>
            <Type size={22} />
            <span className="text-[10px] font-medium">Text</span>
          </button>

          <button onClick={() => toggleTool("filter")}
            className={`flex flex-col items-center gap-1 transition ${activeTool === "filter" ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}>
            <Sliders size={22} />
            <span className="text-[10px] font-medium">Filter</span>
          </button>

          {isVideo ? (
            <button onClick={() => toggleTool("trim")}
              className={`flex flex-col items-center gap-1 transition ${activeTool === "trim" ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}>
              <Scissors size={22} />
              <span className="text-[10px] font-medium">Trim</span>
            </button>
          ) : (
            <button onClick={() => toggleTool("crop")}
              className={`flex flex-col items-center gap-1 transition ${activeTool === "crop" ? "text-purple-400" : "text-gray-500 hover:text-gray-300"}`}>
              <Crop size={22} />
              <span className="text-[10px] font-medium">Crop</span>
            </button>
          )}
        </div>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
