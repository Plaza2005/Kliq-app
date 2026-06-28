import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";

export async function communityRoutes(app: FastifyInstance) {
  // GET /communities — list all communities (public)
  app.get(
    "/",
    { preHandler: [app.authenticate] },
    async (req) => {
      const communities = await app.prisma.community.findMany({
        orderBy: { memberCount: "desc" },
        take: 50,
        include: {
          _count: { select: { members: true } },
          members: {
            where: { userId: req.user.id },
            select: { role: true },
          },
        },
      });

      return communities.map(c => ({
        id:          c.id,
        name:        c.name,
        description: c.description,
        avatarUrl:   c.avatarUrl,
        isPublic:    c.isPublic,
        memberCount: c._count.members,
        isMember:    c.members.length > 0,
        role:        c.members[0]?.role ?? null,
      }));
    }
  );

  // POST /communities — create a community
  app.post<{ Body: { name: string; description?: string; avatarUrl?: string; isPublic?: boolean } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { name, description = "", avatarUrl, isPublic = true } = req.body;
      if (!name?.trim()) return reply.status(400).send({ error: "name is required" });

      const community = await app.prisma.community.create({
        data: {
          name:        name.trim(),
          description: description.trim(),
          avatarUrl:   avatarUrl ?? null,
          isPublic,
          creatorId:   req.user.id,
          memberCount: 1,
          members: {
            create: { userId: req.user.id, role: "admin" },
          },
        },
      });

      return reply.status(201).send({
        id:          community.id,
        name:        community.name,
        description: community.description,
        avatarUrl:   community.avatarUrl,
        isPublic:    community.isPublic,
        memberCount: 1,
        isMember:    true,
        role:        "admin",
      });
    }
  );

  // GET /communities/:id — community metadata
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const c = await app.prisma.community.findUnique({
        where: { id: req.params.id },
        include: {
          _count: { select: { members: true } },
          members: {
            where: { userId: req.user.id },
            select: { role: true },
          },
        },
      });
      if (!c) return reply.status(404).send({ error: "Community not found" });

      return {
        id:          c.id,
        name:        c.name,
        description: c.description,
        avatarUrl:   c.avatarUrl,
        isPublic:    c.isPublic,
        memberCount: c._count.members,
        isMember:    c.members.length > 0,
        role:        c.members[0]?.role ?? null,
      };
    }
  );

  // POST /communities/:id/join
  app.post<{ Params: { id: string } }>(
    "/:id/join",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const community = await app.prisma.community.findUnique({ where: { id: req.params.id } });
      if (!community) return reply.status(404).send({ error: "Community not found" });

      await app.prisma.communityMember.upsert({
        where: { communityId_userId: { communityId: req.params.id, userId: req.user.id } },
        create: { communityId: req.params.id, userId: req.user.id, role: "member" },
        update: {},
      });

      await app.prisma.community.update({
        where: { id: req.params.id },
        data: { memberCount: { increment: 1 } },
      });

      return { ok: true };
    }
  );

  // DELETE /communities/:id/join — leave
  app.delete<{ Params: { id: string } }>(
    "/:id/join",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const community = await app.prisma.community.findUnique({ where: { id: req.params.id } });
      if (!community) return reply.status(404).send({ error: "Community not found" });

      await app.prisma.communityMember.deleteMany({
        where: { communityId: req.params.id, userId: req.user.id },
      });

      await app.prisma.community.update({
        where: { id: req.params.id },
        data: { memberCount: { decrement: 1 } },
      });

      return { ok: true };
    }
  );

  // GET /communities/:id/members
  app.get<{ Params: { id: string } }>(
    "/:id/members",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const community = await app.prisma.community.findUnique({ where: { id: req.params.id } });
      if (!community) return reply.status(404).send({ error: "Community not found" });

      const members = await app.prisma.communityMember.findMany({
        where: { communityId: req.params.id },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
        },
        orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
      });

      return members.map(m => ({
        username:    m.user.username,
        displayName: m.user.displayName,
        avatarUrl:   m.user.avatarUrl,
        isVerified:  m.user.isVerified ?? false,
        role:        m.role,
        joinedAt:    m.joinedAt,
      }));
    }
  );

  // GET /communities/:id/messages?limit=50&before=<id>
  app.get<{ Params: { id: string }; Querystring: { limit?: string; before?: string } }>(
    "/:id/messages",
    { preHandler: [app.authenticate] },
    async (req) => {
      const communityId = req.params.id;
      const limit = Math.min(parseInt(req.query.limit || "50"), 100);
      const before = req.query.before;

      const messages = await app.prisma.communityMessage.findMany({
        where: {
          communityId,
          ...(before ? { id: { lt: before } } : {}),
        },
        orderBy: { createdAt: "asc" },
        take:    limit,
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          replyTo: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      return messages.map(m => mapMessage(m));
    }
  );

  // POST /communities/:id/messages
  app.post<{ Params: { id: string }; Body: { body: string; replyToId?: string } }>(
    "/:id/messages",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const communityId = req.params.id;
      const { body, replyToId } = req.body;

      if (!body?.trim()) {
        return reply.status(400).send({ error: "body is required" });
      }

      if (replyToId) {
        const parent = await app.prisma.communityMessage.findUnique({ where: { id: replyToId } });
        if (!parent || parent.communityId !== communityId) {
          return reply.status(400).send({ error: "replyToId not found in this community" });
        }
      }

      const message = await app.prisma.communityMessage.create({
        data: {
          communityId,
          userId: req.user.id,
          body,
          replyToId: replyToId ?? null,
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } },
          replyTo: {
            include: {
              user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            },
          },
        },
      });

      const mapped = mapMessage(message);
      wsHub.broadcast({ type: "community:message", communityId, message: mapped });

      return reply.status(201).send(mapped);
    }
  );
}

type MsgUser = { id: string; username: string; displayName: string; avatarUrl: string | null; isVerified?: boolean };
type ReplyUser = { id: string; username: string; displayName: string; avatarUrl: string | null };
type RawMessage = {
  id: string;
  communityId: string;
  body: string;
  createdAt: Date;
  user: MsgUser;
  replyTo: null | {
    id: string;
    body: string;
    createdAt: Date;
    user: ReplyUser;
  };
};

function mapMessage(m: RawMessage) {
  return {
    id:          m.id,
    communityId: m.communityId,
    body:        m.body,
    createdAt:   m.createdAt,
    author: {
      id:          m.user.id,
      username:    m.user.username,
      displayName: m.user.displayName,
      avatarUrl:   m.user.avatarUrl,
      isVerified:  m.user.isVerified ?? false,
    },
    ...(m.replyTo ? {
      replyTo: {
        id:        m.replyTo.id,
        body:      m.replyTo.body,
        createdAt: m.replyTo.createdAt,
        author: {
          id:          m.replyTo.user.id,
          username:    m.replyTo.user.username,
          displayName: m.replyTo.user.displayName,
          avatarUrl:   m.replyTo.user.avatarUrl,
        },
      },
    } : {}),
  };
}
