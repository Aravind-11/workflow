"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pollTasksAction } from "@/features/floor-plan/actions";
import type { TaskOnMap, TaskTransition, WrongZoneAlert } from "@/features/floor-plan/types";

type PollerResult = {
  liveTasks: TaskOnMap[];
  transitions: TaskTransition[];
  alerts: WrongZoneAlert[];
};

export function useTaskPoller(
  warehouseId: string,
  initialTasks: TaskOnMap[],
  intervalMs = 5000,
): PollerResult {
  const [liveTasks, setLiveTasks] = useState<TaskOnMap[]>(initialTasks);
  const [transitions, setTransitions] = useState<TaskTransition[]>([]);
  const [alerts, setAlerts] = useState<WrongZoneAlert[]>([]);
  const prevMap = useRef(new Map<string, string | null>());

  useEffect(() => {
    const m = new Map<string, string | null>();
    for (const t of initialTasks) m.set(t.id, t.zoneName);
    prevMap.current = m;
    setLiveTasks(initialTasks);
  }, [initialTasks]);

  const poll = useCallback(async () => {
    try {
      const fresh = await pollTasksAction(warehouseId);
      const newTransitions: TaskTransition[] = [];
      const prev = prevMap.current;

      for (const t of fresh) {
        const oldZone = prev.get(t.id);
        if (oldZone !== undefined && oldZone !== t.zoneName && oldZone && t.zoneName) {
          newTransitions.push({
            taskId: t.id,
            fromZone: oldZone,
            toZone: t.zoneName,
            progress: 0,
          });
        }
      }

      const nextMap = new Map<string, string | null>();
      for (const t of fresh) nextMap.set(t.id, t.zoneName);
      prevMap.current = nextMap;

      setLiveTasks(fresh);

      if (newTransitions.length > 0) {
        setTransitions(newTransitions);
        setTimeout(() => setTransitions([]), 900);
      }

      const newAlerts: WrongZoneAlert[] = [];
      for (const t of fresh) {
        if (!t.expectedRoute || !t.zoneName) continue;
        if (t.status === "COMPLETED" || t.status === "CANCELLED") continue;
        const route = t.expectedRoute;
        const idx = route.indexOf(t.zoneName);
        if (idx === -1) {
          const expected = route[0] ?? "start of route";
          newAlerts.push({
            taskId: t.id,
            taskTitle: t.title,
            expectedZone: expected,
            actualZone: t.zoneName,
          });
        }
      }
      setAlerts(newAlerts);
    } catch {
      // silently skip failed polls
    }
  }, [warehouseId]);

  useEffect(() => {
    const id = setInterval(poll, intervalMs);
    return () => clearInterval(id);
  }, [poll, intervalMs]);

  return { liveTasks, transitions, alerts };
}
