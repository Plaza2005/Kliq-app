import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";

function serializeMessage(m: {
  id: string; body: string; mediaUrl: string | null; mediaType?: string | null;
  readAt: Date | null; deletedAt?: Date | null; createdAt: Date; senderId: string;
  reactions?: { userId: string; emoji: string }[];
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
}, myId: string) {
  const reactionMap: Record<string, number> = {};
  let myReaction: string | undefined;
  for (const r of m.reactions ?? []) {
    reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
    if (r.userId === myId) myReaction = r.emoji;
  }
  return {
    id:        m.id,
    body:      m.deletedAt ? "" : m.body,
    mediaUrl:  m.deletedAt ? null : m.mediaUrl,
    mediaType: m.deletedAt ? null : (m.mediaType ?? null),
    readAt:    m.readAt,
    deleted:   !!m.deletedAt,
    createdAt: m.createdAt,
    isMine:    m.senderId === myId,
    reactions: reactionMap,
    myReaction,
    sender: {
      id:          m.sender.id,
      username:    m.sender.username,
      displayName: m.sender.displayName,
      avatarUrl:   m.sender.avatarUrl,
    },
  };
}

export async function messageRoutes(app: FastifyInstance) {
  // GET /messages/threads
  app.get(
    "/threads",
    { preHandler: [app.authenticate] },
    async (req) => {
      const participations = await app.prisma.threadParticipant.findMany({
        where: { userId: req.user.id },
        include: {
          thread: {
            include: {
              messages: { orderBy: { createdAt: "desc" }, take: 1 },
              participants: {
                include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
              },
            },
          },
        },
        orderBy: { thread: { updatedAt: "desc" } },
        take: 30,
      });

      return participations.map(p => {
        const other = p.thread.participants.find(x => x.userId !== req.user.id);
        const lastMsg = p.thread.messages[0];
        return {
          threadId:    p.thread.id,
          updatedAt:   p.thread.updatedAt,
          other: other ? {
            id:          other.user.id,
            username:    other.user.username,
            displayName: other.user.displayName,
            avatarUrl:   other.user.avatarUrl,
          } : null,
          lastMessage: lastMsg ? { body: lastMsg.body, createdAt: lastMsg.createdAt } : null,
        };
      });
    }
  );

  // GET /messages/threads/:id
  app.get<{ Params: { id: string } }>(
    "/threads/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const participant = await app.prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: req.params.id, userId: req.user.id } },
      });
      if (!participant) return reply.status(403).send({ error: "Not a participant" });

      const messages = await app.prisma.message.findMany({
        where: { threadId: req.params.id },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          reactions: { select: { userId: true, emoji: true } },
        },
      });

      await app.prisma.message.updateMany({
        where: { threadId: req.params.id, readAt: null, senderId: { not: req.user.id } },
        data: { readAt: new Date() },
      });

      return messages.map(m => serializeMessage(m, req.user.id));
    }
  );

  // POST /messages/send  (create or continue DM)
  // GET /messages/threads/:id/poll  — returns messages newer than ?after=<ISO>
  app.get<{ Params: { id: string }; Querystring: { after?: string } }>(
    "/threads/:id/poll",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const participant = await app.prisma.threadParticipant.findUnique({
        where: { threadId_userId: { threadId: req.params.id, userId: req.user.id } },
      });
      if (!participant) return reply.status(403).send({ error: "Not a participant" });

      const since = req.query.after ? new Date(req.query.after) : new Date(0);
      const messages = await app.prisma.message.findMany({
        where: { threadId: req.params.id, createdAt: { gt: since } },
        orderBy: { createdAt: "asc" },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          reactions: { select: { userId: true, emoji: true } },
        },
      });

      await app.prisma.message.updateMany({
        where: { threadId: req.params.id, readAt: null, senderId: { not: req.user.id } },
        data: { readAt: new Date() },
      });

      return messages.map(m => serializeMessage(m, req.user.id));
    }
  );

  // DELETE /messages/:id  — soft-delete own message
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const msg = await app.prisma.message.findUnique({ where: { id: req.params.id } });
      if (!msg) return reply.status(404).send({ error: "Message not found" });
      if (msg.senderId !== req.user.id) return reply.status(403).send({ error: "Not your message" });

      await app.prisma.message.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date(), body: "", mediaUrl: null, mediaType: null },
      });

      // Notify other participant via WS
      const participants = await app.prisma.threadParticipant.findMany({
        where: { threadId: msg.threadId, userId: { not: req.user.id } },
      });
      for (const p of participants) {
        wsHub.send(p.userId, { type: "message:deleted", messageId: req.params.id, threadId: msg.threadId });
      }

      return { ok: true };
    }
  );

  // POST /messages/:id/react  — add or toggle emoji reaction
  app.post<{ Params: { id: string }; Body: { emoji: string } }>(
    "/:id/react",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { emoji } = req.body;
      if (!emoji) return reply.status(400).send({ error: "emoji required" });

      const msg = await app.prisma.message.findUnique({
        where: { id: req.params.id },
        include: { thread: { include: { participants: true } } },
      });
      if (!msg) return reply.status(404).send({ error: "Message not found" });

      const isParticipant = msg.thread.participants.some(p => p.userId === req.user.id);
      if (!isParticipant) return reply.status(403).send({ error: "Not a participant" });

      const existing = await app.prisma.messageReaction.findUnique({
        where: { messageId_userId: { messageId: req.params.id, userId: req.user.id } },
      });

      if (existing?.emoji === emoji) {
        // Same emoji — toggle off
        await app.prisma.messageReaction.delete({
          where: { messageId_userId: { messageId: req.params.id, userId: req.user.id } },
        });
      } else if (existing) {
        // Different emoji — replace
        await app.prisma.messageReaction.update({
          where: { messageId_userId: { messageId: req.params.id, userId: req.user.id } },
          data: { emoji },
        });
      } else {
        await app.prisma.messageReaction.create({
          data: { messageId: req.params.id, userId: req.user.id, emoji },
        });
      }

      // Broadcast updated reaction state to all participants
      const reactions = await app.prisma.messageReaction.findMany({
        where: { messageId: req.params.id },
        select: { userId: true, emoji: true },
      });
      const reactionMap: Record<string, number> = {};
      let myReaction: string | undefined;
      for (const r of reactions) {
        reactionMap[r.emoji] = (reactionMap[r.emoji] ?? 0) + 1;
        if (r.userId === req.user.id) myReaction = r.emoji;
      }

      for (const p of msg.thread.participants) {
        wsHub.send(p.userId, {
          type: "message:reaction",
          messageId: req.params.id,
          threadId: msg.threadId,
          reactions: reactionMap,
          myReaction: p.userId === req.user.id ? myReaction : undefined,
        });
      }

      return { reactions: reactionMap, myReaction };
    }
  );

  app.post<{ Body: { recipientId: string; body?: string; mediaUrl?: string; mediaType?: string; threadId?: string } }>(
    "/send",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { recipientId, body, mediaUrl, mediaType, threadId } = req.body;
      if (!body?.trim() && !mediaUrl) return reply.status(400).send({ error: "Message body or media required" });

      let thread;

      if (threadId) {
        const p = await app.prisma.threadParticipant.findUnique({
          where: { threadId_userId: { threadId, userId: req.user.id } },
        });
        if (!p) return reply.status(403).send({ error: "Not a participant" });
        thread = await app.prisma.thread.findUnique({ where: { id: threadId } });
      } else {
        if (!recipientId) return reply.status(400).send({ error: "recipientId required" });
        const existingParticipants = await app.prisma.threadParticipant.findMany({
          where: { userId: req.user.id },
          include: {
            thread: {
              include: { participants: { where: { userId: recipientId } } },
            },
          },
        });

        const existing = existingParticipants.find(p => p.thread.participants.length > 0);
        if (existing) {
          thread = existing.thread;
        } else {
          thread = await app.prisma.thread.create({
            data: {
              participants: {
                create: [{ userId: req.user.id }, { userId: recipientId }],
              },
            },
          });
        }
      }

      if (!thread) return reply.status(404).send({ error: "Thread not found" });

      const message = await app.prisma.message.create({
        data: {
          threadId: thread.id,
          senderId: req.user.id,
          body: body ?? "",
          ...(mediaUrl   ? { mediaUrl }   : {}),
          ...(mediaType  ? { mediaType }  : {}),
        },
        include: { sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });

      await app.prisma.thread.update({ where: { id: thread.id }, data: { updatedAt: new Date() } });

      const serialized = serializeMessage({ ...message, reactions: [] }, req.user.id);
      const msgPayload = { threadId: thread.id, ...serialized, isMine: false };

      // Push real-time message to all thread participants (except sender)
      const participants = await app.prisma.threadParticipant.findMany({
        where: { threadId: thread.id, userId: { not: req.user.id } },
      });
      for (const p of participants) {
        wsHub.send(p.userId, { type: "message:new", ...msgPayload });
      }

      return reply.status(201).send({ ...msgPayload, isMine: true });
    }
  );
}
