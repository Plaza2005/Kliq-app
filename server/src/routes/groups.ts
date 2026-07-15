import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";

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
      return app.prisma.groupMessage.findMany({
        where: {
          groupId: req.params.id,
          ...(req.query.before ? { createdAt: { lt: new Date(req.query.before) } } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });
    }
  );

  // POST /groups/:id/messages
  app.post<{ Params: { id: string }; Body: { body?: string; mediaUrl?: string; mediaType?: string } }>(
    "/:id/messages",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { body, mediaUrl, mediaType } = req.body;
      if (!body?.trim() && !mediaUrl) return reply.status(400).send({ error: "Message body or media required" });
      const member = await app.prisma.groupChatMember.findFirst({
        where: { groupId: req.params.id, userId: req.user.id },
      });
      if (!member) return reply.status(403).send({ error: "Not a member" });
      const msg = await app.prisma.groupMessage.create({
        data: {
          groupId: req.params.id,
          senderId: req.user.id,
          body,
          mediaUrl,
          mediaType,
        },
        include: {
          sender: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });
      // Broadcast to all members
      const members = await app.prisma.groupChatMember.findMany({ where: { groupId: req.params.id } });
      members.forEach((m) => {
        if (m.userId !== req.user.id) {
          wsHub.send(m.userId, { type: "group:message", groupId: req.params.id, message: msg });
        }
      });
      return msg;
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
