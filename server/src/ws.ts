type Client = { send: (d: string) => void; readyState: number };
const sockets = new Map<string, Set<Client>>();

export const wsHub = {
  register(userId: string, ws: Client) {
    if (!sockets.has(userId)) sockets.set(userId, new Set());
    sockets.get(userId)!.add(ws);
  },

  unregister(userId: string, ws: Client) {
    const set = sockets.get(userId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) sockets.delete(userId);
  },

  send(userId: string, event: object) {
    const set = sockets.get(userId);
    if (!set) return;
    const data = JSON.stringify(event);
    for (const ws of set) {
      if (ws.readyState === 1) ws.send(data);
    }
  },

  // Broadcast to everyone except optional excludeId
  broadcast(event: object, excludeId?: string) {
    const data = JSON.stringify(event);
    for (const [id, set] of sockets) {
      if (id === excludeId) continue;
      for (const ws of set) {
        if (ws.readyState === 1) ws.send(data);
      }
    }
  },

  get size() {
    let total = 0;
    for (const set of sockets.values()) total += set.size;
    return total;
  },
};

// ── Live stream subscriber tracking ───────────────────────────────────────
// Keyed per-socket (not per-user) so multiple connections from the same
// account (e.g. broadcaster + viewer on the same account) don't clobber
// each other's subscription state.

const streamSubscribers = new Map<string, Set<Client>>();

export function subscribeToStream(streamId: string, ws: Client) {
  if (!streamSubscribers.has(streamId)) streamSubscribers.set(streamId, new Set());
  streamSubscribers.get(streamId)!.add(ws);
}

export function unsubscribeFromStream(streamId: string, ws: Client) {
  streamSubscribers.get(streamId)?.delete(ws);
}

export function subscriberCount(streamId: string): number {
  return streamSubscribers.get(streamId)?.size ?? 0;
}

export function broadcastToStream(streamId: string, data: unknown, excludeWs?: Client): number {
  const subs = streamSubscribers.get(streamId);
  if (!subs) return 0;
  const payload = JSON.stringify(data);
  let sent = 0;
  subs.forEach(ws => {
    if (ws === excludeWs) return;
    if (ws.readyState === 1) {
      ws.send(payload);
      sent++;
    }
  });
  return sent;
}

export function clearStreamSubscribers(streamId: string) {
  streamSubscribers.delete(streamId);
  lastChunks.delete(streamId);
}

// ── Live stream last-frame cache ──────────────────────────────────────────
// Lets a newly-subscribed viewer see the current frame instantly instead of
// waiting for the broadcaster's next chunk.

const lastChunks = new Map<string, string>();

export function setLastChunk(streamId: string, chunk: string) {
  lastChunks.set(streamId, chunk);
}

export function getLastChunk(streamId: string): string | undefined {
  return lastChunks.get(streamId);
}

// Alias used by live routes
export const clearStream = clearStreamSubscribers;
