type Client = { send: (d: string) => void; readyState: number };
const sockets = new Map<string, Client>();

export const wsHub = {
  register(userId: string, ws: Client)  { sockets.set(userId, ws); },
  unregister(userId: string)            { sockets.delete(userId); },

  send(userId: string, event: object) {
    const ws = sockets.get(userId);
    if (ws?.readyState === 1) ws.send(JSON.stringify(event));
  },

  // Broadcast to everyone except optional excludeId
  broadcast(event: object, excludeId?: string) {
    const data = JSON.stringify(event);
    for (const [id, ws] of sockets) {
      if (id !== excludeId && ws.readyState === 1) ws.send(data);
    }
  },

  get size() { return sockets.size; },
};

// ── Live stream subscriber tracking ───────────────────────────────────────

const streamSubscribers = new Map<string, Set<string>>();

export function subscribeToStream(streamId: string, userId: string) {
  if (!streamSubscribers.has(streamId)) streamSubscribers.set(streamId, new Set());
  streamSubscribers.get(streamId)!.add(userId);
}

export function unsubscribeFromStream(streamId: string, userId: string) {
  streamSubscribers.get(streamId)?.delete(userId);
}

export function broadcastToStream(streamId: string, data: unknown) {
  const subs = streamSubscribers.get(streamId);
  if (!subs) return;
  const payload = JSON.stringify(data);
  subs.forEach(uid => {
    const ws = sockets.get(uid);
    if (ws && ws.readyState === 1) ws.send(payload);
  });
}

export function clearStreamSubscribers(streamId: string) {
  streamSubscribers.delete(streamId);
}

// Alias used by live routes
export const clearStream = clearStreamSubscribers;
