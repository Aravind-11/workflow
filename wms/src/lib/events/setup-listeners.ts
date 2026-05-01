import { on, EventTypes } from "./bus";
import { broadcastToWarehouse } from "./sse-manager";
import { dispatchWebhook } from "@/features/webhooks/dispatcher";

let initialized = false;

export function setupEventListeners() {
  if (initialized) return;
  initialized = true;

  on(EventTypes.TRACKING_EVENT_CREATED, async (payload) => {
    const warehouseId = payload.warehouseId as string;
    if (warehouseId) {
      broadcastToWarehouse(warehouseId, "tracking.event.created", payload);
      await dispatchWebhook(warehouseId, "tracking.event.created", payload);
    }
  });

  on(EventTypes.TASK_STATUS_CHANGED, async (payload) => {
    const warehouseId = payload.warehouseId as string;
    if (warehouseId) {
      broadcastToWarehouse(warehouseId, "task.status.changed", payload);
      await dispatchWebhook(warehouseId, "task.status.changed", payload);
    }
  });

  on(EventTypes.STAGE_COMPLETED, async (payload) => {
    const warehouseId = payload.warehouseId as string;
    if (warehouseId) {
      broadcastToWarehouse(warehouseId, "workflow.stage.completed", payload);
      await dispatchWebhook(warehouseId, "workflow.stage.completed", payload);
    }
  });

  on(EventTypes.APPROVAL_REQUESTED, async (payload) => {
    const warehouseId = payload.warehouseId as string;
    if (warehouseId) {
      broadcastToWarehouse(warehouseId, "approval.requested", payload);
      await dispatchWebhook(warehouseId, "approval.requested", payload);
    }
  });

  on(EventTypes.ORDER_STATUS_CHANGED, async (payload) => {
    const warehouseId = payload.warehouseId as string;
    if (warehouseId) {
      broadcastToWarehouse(warehouseId, "order.status.changed", payload);
      await dispatchWebhook(warehouseId, "order.status.changed", payload);
    }
  });
}
