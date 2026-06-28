import { FastifyInstance } from "fastify";

export async function blockRoutes(app: FastifyInstance) {
  // POST /blocks/:username — block a user
  app.post<{ Params: { username: string } }>("/:username", { preHandler: [app.authenticate] }, async (req, reply) => {
    const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.status(404).send({ error: "User not found" });
    if (target.id === req.user.id) return reply.status(400).send({ error: "Cannot block yourself" });
    await app.prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: req.user.id, blockedId: target.id } },
      create: { blockerId: req.user.id, blockedId: target.id },
      update: {},
    });
    // Also unfollow both ways
    await app.prisma.follow.deleteMany({ where: { OR: [{ followerId: req.user.id, followingId: target.id }, { followerId: target.id, followingId: req.user.id }] } });
    return { blocked: true };
  });

  // DELETE /blocks/:username — unblock
  app.delete<{ Params: { username: string } }>("/:username", { preHandler: [app.authenticate] }, async (req, reply) => {
    const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.status(404).send({ error: "User not found" });
    await app.prisma.block.deleteMany({ where: { blockerId: req.user.id, blockedId: target.id } });
    return { blocked: false };
  });

  // POST /blocks/:username/mute — mute a user
  app.post<{ Params: { username: string } }>("/:username/mute", { preHandler: [app.authenticate] }, async (req, reply) => {
    const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.status(404).send({ error: "User not found" });
    await app.prisma.mute.upsert({
      where: { muterId_mutedId: { muterId: req.user.id, mutedId: target.id } },
      create: { muterId: req.user.id, mutedId: target.id },
      update: {},
    });
    return { muted: true };
  });

  // DELETE /blocks/:username/mute
  app.delete<{ Params: { username: string } }>("/:username/mute", { preHandler: [app.authenticate] }, async (req, reply) => {
    const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
    if (!target) return reply.status(404).send({ error: "User not found" });
    await app.prisma.mute.deleteMany({ where: { muterId: req.user.id, mutedId: target.id } });
    return { muted: false };
  });

  // GET /blocks — list blocked users
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const blocks = await app.prisma.block.findMany({
      where: { blockerId: req.user.id },
      include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    return blocks.map(b => ({ ...b.blocked, avatarUrl: b.blocked.avatarUrl }));
  });
}
