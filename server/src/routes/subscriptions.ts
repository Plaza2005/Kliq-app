import { FastifyInstance } from "fastify";

export async function subscriptionRoutes(app: FastifyInstance) {
  // GET /subscriptions/creator/:username — get creator subscription info + subscriber's status
  app.get<{ Params: { username: string } }>(
    "/creator/:username",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const creator = await app.prisma.user.findUnique({
        where: { username: req.params.username },
        select: { id: true, username: true, displayName: true, avatarUrl: true, subPrice: true },
      });
      if (!creator) return reply.status(404).send({ error: "User not found" });

      const existing = await app.prisma.creatorSubscription.findUnique({
        where: { subscriberId_creatorId: { subscriberId: req.user.id, creatorId: creator.id } },
      });

      const isActive = existing && (!existing.expiresAt || existing.expiresAt > new Date());
      return {
        creator: { id: creator.id, username: creator.username, displayName: creator.displayName, avatarUrl: creator.avatarUrl },
        subPrice: creator.subPrice ?? null,
        subscribed: !!isActive,
        expiresAt: existing?.expiresAt ?? null,
      };
    }
  );

  // POST /subscriptions/creator/:username — subscribe (deduct tokens, 30-day access)
  app.post<{ Params: { username: string } }>(
    "/creator/:username",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const creator = await app.prisma.user.findUnique({
        where: { username: req.params.username },
        select: { id: true, subPrice: true },
      });
      if (!creator) return reply.status(404).send({ error: "User not found" });
      if (creator.id === req.user.id) return reply.status(400).send({ error: "Cannot subscribe to yourself" });
      if (!creator.subPrice) return reply.status(400).send({ error: "Creator has not set up subscriptions" });

      const wallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet || wallet.tokens < creator.subPrice) {
        return reply.status(400).send({ error: "Insufficient tokens" });
      }

      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await app.prisma.$transaction([
        app.prisma.wallet.update({ where: { userId: req.user.id }, data: { tokens: { decrement: creator.subPrice } } }),
        app.prisma.wallet.upsert({
          where: { userId: creator.id },
          create: { userId: creator.id, tokens: creator.subPrice, balance: 0, diamonds: 0 },
          update: { tokens: { increment: creator.subPrice } },
        }),
      ]);

      await app.prisma.creatorSubscription.upsert({
        where: { subscriberId_creatorId: { subscriberId: req.user.id, creatorId: creator.id } },
        create: { subscriberId: req.user.id, creatorId: creator.id, price: creator.subPrice, expiresAt },
        update: { expiresAt, price: creator.subPrice },
      });

      return { ok: true, expiresAt };
    }
  );

  // DELETE /subscriptions/creator/:username — cancel subscription (no refund, access until expiry)
  app.delete<{ Params: { username: string } }>(
    "/creator/:username",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const creator = await app.prisma.user.findUnique({ where: { username: req.params.username }, select: { id: true } });
      if (!creator) return reply.status(404).send({ error: "User not found" });
      await app.prisma.creatorSubscription.deleteMany({
        where: { subscriberId: req.user.id, creatorId: creator.id },
      });
      return { ok: true };
    }
  );

  // GET /subscriptions/my — list active subscriptions
  app.get("/my", { preHandler: [app.authenticate] }, async (req) => {
    const subs = await app.prisma.creatorSubscription.findMany({
      where: { subscriberId: req.user.id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      orderBy: { createdAt: "desc" },
    });
    if (subs.length === 0) return [];

    const creators = await app.prisma.user.findMany({
      where: { id: { in: subs.map(s => s.creatorId) } },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
    });
    const creatorMap = new Map(creators.map(c => [c.id, c]));

    return subs.map(s => ({
      id: s.id,
      creator: creatorMap.get(s.creatorId) ?? null,
      price: s.price,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
    }));
  });

  // PATCH /subscriptions/price — creator sets their subscription price
  app.patch<{ Body: { price: number | null } }>(
    "/price",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { price } = req.body;
      if (price !== null && (typeof price !== "number" || price < 0)) {
        return reply.status(400).send({ error: "price must be a non-negative number or null" });
      }
      await app.prisma.user.update({
        where: { id: req.user.id },
        data: { subPrice: price ?? null },
      });
      return { ok: true, subPrice: price };
    }
  );
}
