import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";

/// Same snippet convention as DM replies (messages.ts) — truncated text or a
/// media placeholder for the quoted message shown above a group reply.
function groupReplySnippet(rt: { body: string | null; mediaUrl: string | null; mediaType: string | null }) {
  if (rt.mediaType === "sticker") return "Sticker";
  if (rt.mediaType === "audio") return "Voice message";
  if (rt.mediaType === "image" || rt.mediaUrl) return "Photo";
  const trimmed = (rt.body ?? "").trim();
  if (!trimmed) return "";
  return trimmed.length > 60 ? `${trimmed.slice(0, 60)}…` : trimmed;
}

const GROUP_MESSAGE_INCLUDE = {
  sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
  replyTo: {
    include: { sender: { select: { username: true } } },
  },
} as const;

function serializeGroupMessage(m: {
  id: string; groupId: string; senderId: string; body: string | null;
  mediaUrl: string | null; mediaType: string | null; createdAt: Date;
  sender: { id: string; username: string; displayName: string; avatarUrl: string | null };
  replyTo?: null | {
    id: string; body: string | null; mediaUrl: string | null; mediaType: string | null;
    sender: { username: string };
  };
}) {
  return {
    id:        m.id,
    groupId:   m.groupId,
    senderId:  m.senderId,
    body:      m.body,
    mediaUrl:  m.mediaUrl,
    mediaType: m.mediaType,
    createdAt: m.createdAt,
    sender:    m.sender,
    ...(m.replyTo ? {
      replyTo: {
        id:             m.replyTo.id,
        senderUsername: m.replyTo.sender.username,
        snippet:        groupReplySnippet(m.replyTo),
      },
    } : {}),
  };
}

export async function groupRoutes(app: FastifyInstance) {
  // POST /groups — create group chat
  app.post<{ Body: { name: string; memberUsernames: string[]; avatarUrl?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req) => {
      const members = await app.prisma.user.findMany({
        where: { username: { in: req.body.memberUsernames } },
        select: { id: true },
      });
      const group = await app.prisma.groupChat.create({
        data: {
          name: req.body.name,
          avatarUrl: req.body.avatarUrl,
          createdBy: req.user.id,
          members: {
            create: [{ userId: req.user.id }, ...members.map((m) => ({ userId: m.id }))],
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      });
      return group;
    }
  );

  // GET /groups — list my groups
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const memberships = await app.prisma.groupChatMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
              },
            },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { sender: { select: { username: true, displayName: true } } },
            },
          },
        },
      },
    });
    return memberships.map((m) => m.group);
  });

  // GET /groups/:id — get group info (members etc.)
  app.get<{ Params: { id: string } }>("/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const member = await app.prisma.groupChatMember.findFirst({ where: { groupId: req.params.id, userId: req.user.id } });
    if (!member) return reply.status(403).send({ error: "Not a member" });
    return app.prisma.groupChat.findUnique({
      where: { id: req.params.id },
      include: {
        members: {
          include: {
            user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    });
  });

  // GET /groups/:id/messages
  app.get<{ Params: { id: string }; Querystring: { before?: string } }>(
    "/:id/messages",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const member = await app.prisma.groupChatMember.findFirst({
        where: { groupId: req.params.id, userId: req.user.id },
      });
      if (!member) return reply.status(403).send({ error: "Not a member" });
      const messages = await app.prisma.groupMessage.findMany({
        where: {
          groupId: req.params.id,
          ...(req.query.before ? { createdAt: { lt: new Date(req.query.before) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: GROUP_MESSAGE_INCLUDE,
      });
      return messages.map(serializeGroupMessage);
    }
  );

  // POST /groups/:id/messages
  app.post<{ Params: { id: string }; Body: { body?: string; mediaUrl?: string; mediaType?: string; replyToId?: string } }>(
    "/:id/messages",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { body, mediaUrl, mediaType, replyToId } = req.body;
      if (!body?.trim() && !mediaUrl) return reply.status(400).send({ error: "Message body or media required" });
      const member = await app.prisma.groupChatMember.findFirst({
        where: { groupId: req.params.id, userId: req.user.id },
      });
      if (!member) return reply.status(403).send({ error: "Not a member" });

      if (replyToId) {
        const parent = await app.prisma.groupMessage.findUnique({ where: { id: replyToId } });
        if (!parent || parent.groupId !== req.params.id) {
          return reply.status(400).send({ error: "replyToId not found in this group" });
        }
      }

      const msg = await app.prisma.groupMessage.create({
        data: {
          groupId: req.params.id,
          senderId: req.user.id,
          body,
          mediaUrl,
          mediaType,
          ...(replyToId ? { replyToId } : {}),
        },
        include: GROUP_MESSAGE_INCLUDE,
      });
      const serialized = serializeGroupMessage(msg);
      // Broadcast to all members
      const members = await app.prisma.groupChatMember.findMany({ where: { groupId: req.params.id } });
      members.forEach((m) => {
        if (m.userId !== req.user.id) {
          wsHub.send(m.userId, { type: "group:message", groupId: req.params.id, message: serialized });
        }
      });
      return serialized;
    }
  );

  // POST /groups/:id/members — add member
  app.post<{ Params: { id: string }; Body: { username: string } }>(
    "/:id/members",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.body.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });
      await app.prisma.groupChatMember.upsert({
        where: { groupId_userId: { groupId: req.params.id, userId: user.id } },
        create: { groupId: req.params.id, userId: user.id },
        update: {},
      });
      return { ok: true };
    }
  );
}
