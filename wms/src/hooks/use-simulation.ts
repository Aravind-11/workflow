"use client";

import { useCallback, useRef, useState } from "react";
import {
  seedSimulationAction,
  updateTaskZoneAction,
  updateTaskStatusAction,
  raiseTicketAction,
} from "@/features/floor-plan/actions";
import type { FloorZone, RouteTemplate, TaskOnMap } from "@/features/floor-plan/types";

type SimLog = { ts: number; msg: string };

type SimResult = {
  simulating: boolean;
  seeding: boolean;
  log: SimLog[];
  start: () => void;
  stop: () => void;
};

export function useSimulation(
  warehouseId: string,
  zones: FloorZone[],
  tasks: TaskOnMap[],
  routes: RouteTemplate[],
): SimResult {
  const [simulating, setSimulating] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [log, setLog] = useState<SimLog[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tasksRef = useRef<TaskOnMap[]>(tasks);
  const routesRef = useRef<RouteTemplate[]>(routes);

  // Keep refs in sync with latest props
  tasksRef.current = tasks;
  routesRef.current = routes;

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [{ ts: Date.now(), msg }, ...prev].slice(0, 30));
  }, []);

  const tick = useCallback(async () => {
    const currentTasks = tasksRef.current;
    const currentRoutes = routesRef.current;
    const zoneNames = zones.map((z) => z.name);

    const active = currentTasks.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "OPEN",
    );

    if (active.length === 0) {
      addLog("All tasks completed — simulation finished.");
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setSimulating(false);
      return;
    }

    const task = active[Math.floor(Math.random() * active.length)];
    const route = currentRoutes.find((r) => r.id === task.routeTemplateId);
    const routeSeq = route?.zoneSequence ?? task.expectedRoute ?? zoneNames;
    const currentIdx = task.zoneName ? routeSeq.indexOf(task.zoneName) : -1;

    const roll = Math.random();

    if (roll < 0.05) {
      // 5% — raise ticket
      await raiseTicketAction({
        taskId: task.id,
        reason: "BLOCKED",
        details: "Simulated blockage",
      });
      addLog(`TICKET: "${task.title}" blocked`);
    } else if (roll < 0.15) {
      // 10% — complete task
      await updateTaskStatusAction({ taskId: task.id, status: "COMPLETED" });
      addLog(`DONE: "${task.title}" completed`);
    } else if (roll < 0.30) {
      // 15% — wrong zone
      const wrongZones = zoneNames.filter(
        (z) => z !== task.zoneName && z !== routeSeq[currentIdx + 1],
      );
      if (wrongZones.length > 0) {
        const wrongZone = wrongZones[Math.floor(Math.random() * wrongZones.length)];
        await updateTaskZoneAction({ taskId: task.id, zoneName: wrongZone });
        addLog(`WRONG ZONE: "${task.title}" → ${wrongZone}`);
      }
    } else {
      // 70% — normal next zone
      const nextIdx = currentIdx + 1;
      if (nextIdx < routeSeq.length) {
        const nextZone = routeSeq[nextIdx];
        await updateTaskZoneAction({ taskId: task.id, zoneName: nextZone });
        addLog(`Moved "${task.title}" → ${nextZone}`);
      } else {
        // Reached end of route — complete
        await updateTaskStatusAction({ taskId: task.id, status: "COMPLETED" });
        addLog(`DONE: "${task.title}" reached end of route`);
      }
    }
  }, [zones, addLog]);

  const start = useCallback(async () => {
    const zoneNames = zones.map((z) => z.name);
    if (zoneNames.length < 2) {
      addLog("Need at least 2 zones to simulate. Draw zones first.");
      return;
    }

    setSeeding(true);
    setLog([]);
    addLog("Starting simulation…");

    const active = tasksRef.current.filter(
      (t) => t.status === "IN_PROGRESS" || t.status === "OPEN",
    );

    if (active.length < 4) {
      addLog("Seeding 5 demo tasks…");
      const r = await seedSimulationAction({ warehouseId, zoneNames });
      if (!r.ok) {
        addLog(`Seed failed: ${r.error}`);
        setSeeding(false);
        return;
      }
      addLog(`Created ${r.data.taskIds.length} tasks + Demo Flow route`);
    }

    setSeeding(false);
    setSimulating(true);
    addLog("Simulation running — one step every 4s");

    intervalRef.current = setInterval(tick, 4000);
  }, [warehouseId, zones, tick, addLog]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSimulating(false);
    addLog("Simulation stopped.");
  }, [addLog]);

  return { simulating, seeding, log, start, stop };
}
