type SSEClient = {
  warehouseId: string;
  controller: ReadableStreamDefaultController;
};

const clients: SSEClient[] = [];

export function addClient(warehouseId: string, controller: ReadableStreamDefaultController) {
  clients.push({ warehouseId, controller });
}

export function removeClient(controller: ReadableStreamDefaultController) {
  const idx = clients.findIndex((c) => c.controller === controller);
  if (idx >= 0) clients.splice(idx, 1);
}

export function broadcastToWarehouse(warehouseId: string, event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  const encoded = encoder.encode(payload);

  for (const client of clients) {
    if (client.warehouseId === warehouseId) {
      try {
        client.controller.enqueue(encoded);
      } catch {
        removeClient(client.controller);
      }
    }
  }
}

export function getClientCount(warehouseId?: string): number {
  if (warehouseId) {
    return clients.filter((c) => c.warehouseId === warehouseId).length;
  }
  return clients.length;
}
