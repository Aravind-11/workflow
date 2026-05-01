type EventHandler = (payload: Record<string, unknown>) => void | Promise<void>;

const listeners = new Map<string, EventHandler[]>();

export function on(event: string, handler: EventHandler) {
  const existing = listeners.get(event) ?? [];
  existing.push(handler);
  listeners.set(event, existing);
  return () => {
    const list = listeners.get(event);
    if (list) {
      listeners.set(event, list.filter((h) => h !== handler));
    }
  };
}

export async function emit(event: string, payload: Record<string, unknown>) {
  const handlers = listeners.get(event) ?? [];
  const wildcardHandlers = listeners.get("*") ?? [];
  const all = [...handlers, ...wildcardHandlers];

  for (const handler of all) {
    try {
      await handler({ ...payload, _event: event });
    } catch (err) {
      console.error(`[EventBus] Error in handler for "${event}":`, err);
    }
  }
}

export const EventTypes = {
  TRACKING_EVENT_CREATED: "tracking.event.created",
  TASK_STATUS_CHANGED: "task.status.changed",
  STAGE_COMPLETED: "workflow.stage.completed",
  APPROVAL_REQUESTED: "approval.requested",
  APPROVAL_RESOLVED: "approval.resolved",
  ORDER_STATUS_CHANGED: "order.status.changed",
  WORKER_CLOCK_IN: "worker.clock.in",
  WORKER_CLOCK_OUT: "worker.clock.out",
} as const;
