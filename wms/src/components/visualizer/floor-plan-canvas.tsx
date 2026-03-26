"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import type { FloorZone, TaskOnMap, ZoneWorkforce } from "@/features/floor-plan/types";

const ZONE_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

type Mode = "view" | "draw" | "edit";

type Props = {
  imageData: string | null;
  zones: FloorZone[];
  tasks: TaskOnMap[];
  selectedTaskId: string | null;
  selectedZoneName: string | null;
  zoneWorkforce: Record<string, ZoneWorkforce>;
  onZonesChange: (zones: FloorZone[]) => void;
  onTaskClick: (taskId: string) => void;
  onZoneClick: (zoneName: string) => void;
  onImageUpload: (base64: string) => void;
};

export function FloorPlanCanvas({
  imageData,
  zones,
  tasks,
  selectedTaskId,
  selectedZoneName,
  zoneWorkforce,
  onZonesChange,
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

      const wf = zoneWorkforce[zone.name];
      if (wf) {
        ctx.font = "bold 13px system-ui, sans-serif";
        const nameWidth = ctx.measureText(zone.name).width;

        const pillText = `${wf.workerCount}w · ${wf.percentage}%`;
        ctx.font = "bold 10px system-ui, sans-serif";
        const pillW = ctx.measureText(pillText).width + 10;
        const pillH = 16;
        const pillX = zone.x + 6 + nameWidth + 8;
        const pillY = zone.y + 6;

        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.fillStyle = isSelected ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.5)";
        ctx.beginPath();
        ctx.roundRect(pillX, pillY, pillW, pillH, 4);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = "#ffffff";
        ctx.font = "bold 10px system-ui, sans-serif";
        ctx.fillText(pillText, pillX + 5, pillY + 12);
      }
    }

    if (drawing && mode === "draw") {
      const w = drawing.curX - drawing.startX;
      const h = drawing.curY - drawing.startY;
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(drawing.startX, drawing.startY, w, h);
      ctx.setLineDash([]);
    }

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
  }, [zones, drawing, mode, visibleTasks, selectedTaskId, selectedZoneName, editingZone, canvasSize, zoneWorkforce]);

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
    if (mode === "draw") {
      const pos = getCanvasPos(e);
      setDrawing({ startX: pos.x, startY: pos.y, curX: pos.x, curY: pos.y });
    } else if (mode === "view") {
      const pos = getCanvasPos(e);
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
    if (mode === "draw" && drawing) {
      const pos = getCanvasPos(e);
      setDrawing((d) => (d ? { ...d, curX: pos.x, curY: pos.y } : null));
    }
  }

  function handleMouseUp() {
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
    if (editingZone === zoneId) setEditingZone(null);
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

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setMode(mode === "view" ? "draw" : "view")}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            mode === "draw"
              ? "bg-blue-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15"
          }`}
        >
          {mode === "draw" ? "Drawing zones…" : "Draw zone"}
        </button>

        {mode === "draw" && (
          <input
            placeholder="Zone name"
            value={zoneName}
            onChange={(e) => setZoneName(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs dark:border-navy-border dark:bg-navy dark:text-gray-200"
          />
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
            {zones.length} zone{zones.length !== 1 ? "s" : ""} · {visibleTasks.length} task{visibleTasks.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-navy-border">
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className={`w-full ${mode === "draw" ? "cursor-crosshair" : "cursor-default"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
      </div>

      {zones.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => {
            const wf = zoneWorkforce[z.name];
            return (
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
                {wf && (
                  <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                    {wf.workerCount}w · {wf.percentage}%
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => deleteZone(z.id)}
                  className="ml-1 text-slate-400 hover:text-red-500 dark:text-slate-500"
                  title="Delete zone"
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
