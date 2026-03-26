"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { FloorArrow, FloorZone, TaskOnMap } from "@/features/floor-plan/types";

const ZONE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

type Mode = "view" | "draw" | "arrow";

type Props = {
  imageData: string | null;
  zones: FloorZone[];
  arrows: FloorArrow[];
  tasks: TaskOnMap[];
  selectedTaskId: string | null;
  selectedZoneName: string | null;
  onZonesChange: (zones: FloorZone[]) => void;
  onArrowsChange: (arrows: FloorArrow[]) => void;
  onTaskClick: (taskId: string) => void;
  onZoneClick: (zoneName: string) => void;
  onImageUpload: (base64: string) => void;
};

export function FloorPlanCanvas({
  imageData,
  zones,
  arrows,
  tasks,
  selectedTaskId,
  selectedZoneName,
  onZonesChange,
  onArrowsChange,
  onTaskClick,
  onZoneClick,
  onImageUpload,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bgImage = useRef<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<Mode>("view");
  const [drawing, setDrawing] = useState<{
    startX: number;
    startY: number;
    curX: number;
    curY: number;
  } | null>(null);
  const [arrowDrag, setArrowDrag] = useState<{
    fromZoneId: string;
    curX: number;
    curY: number;
  } | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [canvasSize, setCanvasSize] = useState({ w: 900, h: 600 });
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const visibleTasks = tasks;

  useEffect(() => {
    if (!imageData) return;
    const img = new Image();
    img.onload = () => {
      bgImage.current = img;
      const container = containerRef.current;
      if (container) {
        const maxW = container.clientWidth;
        const scale = Math.min(1, maxW / img.width);
        setCanvasSize({
          w: Math.round(img.width * scale),
          h: Math.round(img.height * scale),
        });
      }
      draw();
    };
    img.src = imageData;
  }, [imageData]);

  function zoneCenter(z: FloorZone): { x: number; y: number } {
    return { x: z.x + z.width / 2, y: z.y + z.height / 2 };
  }

  function edgePoint(from: { x: number; y: number }, to: { x: number; y: number }, zone: FloorZone): { x: number; y: number } {
    const cx = zone.x + zone.width / 2;
    const cy = zone.y + zone.height / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    const hw = zone.width / 2;
    const hh = zone.height / 2;

    let tMin = Infinity;
    if (dx !== 0) {
      const tRight = hw / Math.abs(dx);
      const tLeft = hw / Math.abs(dx);
      tMin = Math.min(tMin, dx > 0 ? tRight : tLeft);
    }
    if (dy !== 0) {
      const tBottom = hh / Math.abs(dy);
      const tTop = hh / Math.abs(dy);
      tMin = Math.min(tMin, dy > 0 ? tBottom : tTop);
    }

    return {
      x: cx + dx * tMin,
      y: cy + dy * tMin,
    };
  }

  function drawArrowhead(ctx: CanvasRenderingContext2D, toX: number, toY: number, fromX: number, fromY: number, size: number) {
    const angle = Math.atan2(toY - fromY, toX - fromX);
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - size * Math.cos(angle - Math.PI / 6),
      toY - size * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      toX - size * Math.cos(angle + Math.PI / 6),
      toY - size * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fill();
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage.current) {
      ctx.drawImage(bgImage.current, 0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = "#1e293b";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#334155";
      ctx.lineWidth = 1;
      const step = 40;
      for (let x = 0; x < canvas.width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    }

    for (const zone of zones) {
      const isEditing = editingZone === zone.id;
      const isSelected = selectedZoneName === zone.name;
      ctx.save();
      ctx.globalAlpha = isSelected ? 0.3 : 0.18;
      ctx.fillStyle = zone.color;
      ctx.fillRect(zone.x, zone.y, zone.width, zone.height);
      ctx.restore();

      ctx.strokeStyle = isSelected ? "#ffffff" : zone.color;
      ctx.lineWidth = isSelected ? 3 : isEditing ? 3 : 2;
      ctx.setLineDash(isEditing ? [6, 4] : []);
      ctx.strokeRect(zone.x, zone.y, zone.width, zone.height);
      ctx.setLineDash([]);

      if (isSelected) {
        ctx.strokeStyle = zone.color;
        ctx.lineWidth = 1;
        ctx.strokeRect(zone.x - 2, zone.y - 2, zone.width + 4, zone.height + 4);
      }

      ctx.fillStyle = isSelected ? "#ffffff" : zone.color;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(zone.name, zone.x + 6, zone.y + 18);
    }

    // Draw arrows between zones
    const zoneById = new Map(zones.map((z) => [z.id, z]));
    for (const arrow of arrows) {
      const fromZ = zoneById.get(arrow.fromZoneId);
      const toZ = zoneById.get(arrow.toZoneId);
      if (!fromZ || !toZ) continue;

      const fromCenter = zoneCenter(fromZ);
      const toCenter = zoneCenter(toZ);
      const start = edgePoint(fromCenter, toCenter, fromZ);
      const end = edgePoint(toCenter, fromCenter, toZ);

      ctx.save();
      ctx.strokeStyle = "#94a3b8";
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();

      ctx.fillStyle = "#94a3b8";
      drawArrowhead(ctx, end.x, end.y, start.x, start.y, 12);

      if (arrow.label) {
        const midX = (start.x + end.x) / 2;
        const midY = (start.y + end.y) / 2;
        ctx.font = "bold 10px system-ui, sans-serif";
        const tw = ctx.measureText(arrow.label).width;
        ctx.fillStyle = "rgba(15,23,42,0.8)";
        ctx.beginPath();
        ctx.roundRect(midX - tw / 2 - 5, midY - 8, tw + 10, 16, 4);
        ctx.fill();
        ctx.fillStyle = "#e2e8f0";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(arrow.label, midX, midY);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      }

      ctx.restore();
    }

    // Live arrow preview while dragging
    if (arrowDrag) {
      const fromZ = zoneById.get(arrowDrag.fromZoneId);
      if (fromZ) {
        const fromCenter = zoneCenter(fromZ);
        const start = edgePoint(fromCenter, { x: arrowDrag.curX, y: arrowDrag.curY }, fromZ);

        ctx.save();
        ctx.strokeStyle = "#60a5fa";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(arrowDrag.curX, arrowDrag.curY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#60a5fa";
        drawArrowhead(ctx, arrowDrag.curX, arrowDrag.curY, start.x, start.y, 12);
        ctx.restore();
      }
    }

    // Draw zone rectangle while drawing
    if (drawing && mode === "draw") {
      const w = drawing.curX - drawing.startX;
      const h = drawing.curY - drawing.startY;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(drawing.startX, drawing.startY, w, h);
      ctx.setLineDash([]);
    }

    // Draw task dots
    const zoneTasks = new Map<string, TaskOnMap[]>();
    const unzoned: TaskOnMap[] = [];
    for (const t of visibleTasks) {
      if (t.zoneName) {
        const arr = zoneTasks.get(t.zoneName) ?? [];
        arr.push(t);
        zoneTasks.set(t.zoneName, arr);
      } else {
        unzoned.push(t);
      }
    }

    for (const zone of zones) {
      const zTasks = zoneTasks.get(zone.name) ?? [];
      zTasks.forEach((t, i) => {
        const col = Math.floor(i % 4);
        const row = Math.floor(i / 4);
        const tx = zone.x + 10 + col * 28;
        const ty = zone.y + 34 + row * 28;
        const isSelected = t.id === selectedTaskId;
        const radius = isSelected ? 12 : 10;

        ctx.beginPath();
        ctx.arc(tx, ty, radius, 0, Math.PI * 2);
        ctx.fillStyle = taskColor(t);
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.priority.toString(), tx, ty);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      });
    }

    if (unzoned.length > 0) {
      const ux = 10;
      const uy = canvas.height - 40;
      ctx.fillStyle = "rgba(51,65,85,0.8)";
      ctx.fillRect(ux, uy - 10, Math.min(unzoned.length * 28 + 90, canvas.width - 20), 36);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "11px system-ui";
      ctx.fillText("Unzoned:", ux + 6, uy + 10);

      unzoned.forEach((t, i) => {
        const tx = ux + 78 + i * 28;
        const ty = uy + 8;
        const isSelected = t.id === selectedTaskId;

        ctx.beginPath();
        ctx.arc(tx, ty, isSelected ? 12 : 10, 0, Math.PI * 2);
        ctx.fillStyle = taskColor(t);
        ctx.fill();
        if (isSelected) {
          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 9px system-ui";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(t.priority.toString(), tx, ty);
        ctx.textAlign = "start";
        ctx.textBaseline = "alphabetic";
      });
    }
  }, [zones, arrows, drawing, arrowDrag, mode, visibleTasks, selectedTaskId, selectedZoneName, editingZone, canvasSize]);

  useEffect(() => {
    draw();
  }, [draw]);

  function getCanvasPos(e: ReactMouseEvent<HTMLCanvasElement>): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handleMouseDown(e: ReactMouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e);
    if (mode === "draw") {
      setDrawing({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
    } else if (mode === "arrow") {
      const zone = findZoneAt(pos.x, pos.y);
      if (zone) {
        setArrowDrag({ fromZoneId: zone.id, curX: pos.x, curY: pos.y });
      }
    } else if (mode === "view") {
      const clickedTask = findTaskAt(pos.x, pos.y);
      if (clickedTask) {
        onTaskClick(clickedTask.id);
        return;
      }
      const clickedZone = findZoneAt(pos.x, pos.y);
      if (clickedZone) {
        onZoneClick(clickedZone.name);
      }
    }
  }

  function handleMouseMove(e: ReactMouseEvent<HTMLCanvasElement>) {
    const pos = getCanvasPos(e);
    if (mode === "draw" && drawing) {
      setDrawing((d) => (d ? { ...d, curX: pos.x, curY: pos.y } : null));
    } else if (mode === "arrow" && arrowDrag) {
      setArrowDrag((d) => (d ? { ...d, curX: pos.x, curY: pos.y } : null));
    }
  }

  function handleMouseUp(e: ReactMouseEvent<HTMLCanvasElement>) {
    if (mode === "draw" && drawing) {
      const w = Math.abs(drawing.curX - drawing.startX);
      const h = Math.abs(drawing.curY - drawing.startY);
      if (w > 20 && h > 20) {
        const name = zoneName.trim() || `Zone ${zones.length + 1}`;
        const newZone: FloorZone = {
          id: crypto.randomUUID(),
          name,
          x: Math.min(drawing.startX, drawing.curX),
          y: Math.min(drawing.startY, drawing.curY),
          width: w,
          height: h,
          color: ZONE_COLORS[zones.length % ZONE_COLORS.length],
        };
        onZonesChange([...zones, newZone]);
        setZoneName("");
      }
      setDrawing(null);
    } else if (mode === "arrow" && arrowDrag) {
      const pos = getCanvasPos(e);
      const toZone = findZoneAt(pos.x, pos.y);
      if (toZone && toZone.id !== arrowDrag.fromZoneId) {
        const exists = arrows.some(
          (a) => a.fromZoneId === arrowDrag.fromZoneId && a.toZoneId === toZone.id,
        );
        if (!exists) {
          const newArrow: FloorArrow = {
            id: crypto.randomUUID(),
            fromZoneId: arrowDrag.fromZoneId,
            toZoneId: toZone.id,
          };
          onArrowsChange([...arrows, newArrow]);
        }
      }
      setArrowDrag(null);
    }
  }

  function findTaskAt(x: number, y: number): TaskOnMap | undefined {
    for (const zone of zones) {
      const zTasks = visibleTasks.filter((t) => t.zoneName === zone.name);
      for (let i = 0; i < zTasks.length; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const tx = zone.x + 10 + col * 28;
        const ty = zone.y + 34 + row * 28;
        if (Math.hypot(x - tx, y - ty) <= 12) return zTasks[i];
      }
    }
    const unzoned = visibleTasks.filter((t) => !t.zoneName);
    const ux = 10;
    const uy = (canvasRef.current?.height ?? 600) - 40;
    for (let i = 0; i < unzoned.length; i++) {
      const tx = ux + 78 + i * 28;
      const ty = uy + 8;
      if (Math.hypot(x - tx, y - ty) <= 12) return unzoned[i];
    }
    return undefined;
  }

  function findZoneAt(x: number, y: number): FloorZone | undefined {
    for (let i = zones.length - 1; i >= 0; i--) {
      const z = zones[i];
      if (x >= z.x && x <= z.x + z.width && y >= z.y && y <= z.y + z.height) {
        return z;
      }
    }
    return undefined;
  }

  function deleteZone(zoneId: string) {
    onZonesChange(zones.filter((z) => z.id !== zoneId));
    onArrowsChange(arrows.filter((a) => a.fromZoneId !== zoneId && a.toZoneId !== zoneId));
    if (editingZone === zoneId) setEditingZone(null);
  }

  function deleteArrow(arrowId: string) {
    onArrowsChange(arrows.filter((a) => a.id !== arrowId));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") onImageUpload(reader.result);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  const zoneById = new Map(zones.map((z) => [z.id, z]));

  const btnCls = (active: boolean) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition ${
      active
        ? "bg-blue-600 text-white"
        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
    }`;

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "draw" ? "view" : "draw")}
          className={btnCls(mode === "draw")}
        >
          {mode === "draw" ? "Drawing zones…" : "Draw zone"}
        </button>

        <button
          type="button"
          onClick={() => setMode(mode === "arrow" ? "view" : "arrow")}
          className={btnCls(mode === "arrow")}
        >
          {mode === "arrow" ? "Drawing arrows…" : "Draw arrow"}
        </button>

        {mode === "draw" && (
          <input
            placeholder="Zone name"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200"
          />
        )}

        {mode === "arrow" && (
          <span className="text-[10px] text-slate-500 dark:text-slate-400">
            Drag from one zone to another
          </span>
        )}

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
        >
          Upload map image
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {zones.length > 0 && (
          <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
            {zones.length} zone{zones.length !== 1 ? "s" : ""}
            {arrows.length > 0 && <> · {arrows.length} arrow{arrows.length !== 1 ? "s" : ""}</>}
            {" "}· {visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-navy-border">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className={`w-full ${mode === "draw" || mode === "arrow" ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {/* Zone chips */}
      {zones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <div
              key={z.id}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-navy-border"
            >
              <span
                className="inline-block h-3 w-3 rounded"
                style={{ backgroundColor: z.color }}
              />
              <span className="font-medium text-slate-700 dark:text-gray-300">{z.name}</span>
              <span className="text-slate-400 dark:text-slate-500">
                ({visibleTasks.filter((t) => t.zoneName === z.name).length})
              </span>
              <button
                type="button"
                onClick={() => deleteZone(z.id)}
                className="ml-1 text-slate-400 hover:text-red-500 dark:text-slate-500"
                title="Delete zone"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Arrow chips */}
      {arrows.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {arrows.map((a) => {
            const fromZ = zoneById.get(a.fromZoneId);
            const toZ = zoneById.get(a.toZoneId);
            if (!fromZ || !toZ) return null;
            return (
              <div
                key={a.id}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-navy-border"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: fromZ.color }}
                />
                <span className="font-medium text-slate-600 dark:text-gray-400">
                  {fromZ.name}
                </span>
                <span className="text-slate-400">→</span>
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: toZ.color }}
                />
                <span className="font-medium text-slate-600 dark:text-gray-400">
                  {toZ.name}
                </span>
                {a.label && (
                  <span className="text-slate-400 dark:text-slate-500">
                    ({a.label})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteArrow(a.id)}
                  className="ml-1 text-slate-400 hover:text-red-500 dark:text-slate-500"
                  title="Delete arrow"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function taskColor(t: TaskOnMap): string {
  if (t.status === "IN_PROGRESS") return "#3b82f6";
  if (t.priority <= 1) return "#ef4444";
  if (t.priority <= 2) return "#f59e0b";
  return "#10b981";
}
