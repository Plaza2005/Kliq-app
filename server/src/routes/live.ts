import { FastifyInstance } from "fastify";
import * as crypto from "crypto";
import { clearStreamSubscribers } from "../ws";

export async function liveRoutes(app: FastifyInstance) {
  // POST /live/start
  app.post<{ Body: { title: string; category?: string; thumbnailUrl?: string } }>(
    "/start",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { title, category = "Entertainment", thumbnailUrl } = req.body;
      if (!title) return reply.status(400).send({ error: "title is required" });

      // End any existing live stream for this user first
      await app.prisma.liveStream.updateMany({
        where: { userId: req.user.id, isLive: true },
        data: { isLive: false, endedAt: new Date() },
      });

      const stream = await app.prisma.liveStream.upsert({
        where: { userId: req.user.id },
        create: {
          userId: req.user.id,
          title,
          category,
          thumbnailUrl,
          isLive: true,
          startedAt: new Date(),
          endedAt: null,
        },
        update: {
          title,
          category,
          thumbnailUrl,
          isLive: true,
          viewerCount: 0,
          startedAt: new Date(),
          endedAt: null,
        },
      });

      // Generate a stream key (not stored; client uses streamId + JWT in WS)
      const streamKey = crypto.randomBytes(24).toString("hex");
      return reply.status(201).send({ streamId: stream.id, streamKey });
    }
  );

  // POST /live/end
  app.post(
    "/end",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const stream = await app.prisma.liveStream.findUnique({
        where: { userId: req.user.id },
      });
      if (!stream) return reply.status(404).send({ error: "No active stream found" });

      await app.prisma.liveStream.update({
        where: { userId: req.user.id },
        data: { isLive: false, endedAt: new Date() },
      });

      clearStreamSubscribers(stream.id);
      return { ended: true, streamId: stream.id };
    }
  );

  // GET /live/streams
  app.get(
    "/streams",
    { preHandler: [app.authenticate] },
    async () => {
      const streams = await app.prisma.liveStream.findMany({
        where: { isLive: true },
        orderBy: { viewerCount: "desc" },
        include: {
          user: {
            select: {
              id: true, username: true, displayName: true,
              avatarUrl: true, isVerified: true,
            },
          },
        },
      });

      return streams.map(s => ({
        id:           s.id,
        title:        s.title,
        category:     s.category,
        thumbnailUrl: s.thumbnailUrl,
        viewerCount:  s.viewerCount,
        startedAt:    s.startedAt,
        user: {
          id:          s.user.id,
          username:    s.user.username,
          displayName: s.user.displayName,
          avatarUrl:   s.user.avatarUrl,
          isVerified:  s.user.isVerified,
        },
      }));
    }
  );

  // POST /live/:streamId/view
  app.post<{ Params: { streamId: string } }>(
    "/:streamId/view",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const stream = await app.prisma.liveStream.findUnique({
        where: { id: req.params.streamId },
      });
      if (!stream) return reply.status(404).send({ error: "Stream not found" });

      const updated = await app.prisma.liveStream.update({
        where: { id: req.params.streamId },
        data: { viewerCount: { increment: 1 } },
        select: { id: true, viewerCount: true },
      });

      // Push the new count to the broadcaster (who subscribes to its own stream)
      // and to viewers, so the live viewer count updates in realtime everywhere.
      const { broadcastToStream, wsHub } = await import("../ws");
      const event = {
        type: "live:viewers",
        streamId: req.params.streamId,
        viewerCount: updated.viewerCount,
      };
      broadcastToStream(req.params.streamId, event);
      wsHub.send(stream.userId, event);

      return { viewerCount: updated.viewerCount };
    }
  );

  // POST /live/:streamId/gift — send a virtual gift
  app.post<{ Params: { streamId: string }; Body: { giftType: string } }>(
    "/:streamId/gift",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const GIFT_COSTS: Record<string, number> = {
        rose: 1, heart: 5, star: 10, diamond: 50, crown: 100, rocket: 200,
      };
      const { giftType } = req.body;
      const coins = GIFT_COSTS[giftType] ?? 1;

      const wallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet || wallet.tokens < coins) return reply.status(400).send({ error: "Insufficient tokens" });

      const stream = await app.prisma.liveStream.findUnique({ where: { id: req.params.streamId } });
      if (!stream) return reply.status(404).send({ error: "Stream not found" });

      await app.prisma.$transaction([
        app.prisma.wallet.update({ where: { userId: req.user.id }, data: { tokens: { decrement: coins } } }),
        app.prisma.wallet.upsert({ where: { userId: stream.userId }, create: { userId: stream.userId, tokens: 0, balance: 0, diamonds: coins }, update: { diamonds: { increment: coins } } }),
      ]);

      // Store the gift
      await app.prisma.$executeRaw`INSERT INTO "LiveGift" (id, senderId, streamId, giftType, coins, createdAt) VALUES (${require('crypto').randomUUID()}, ${req.user.id}, ${req.params.streamId}, ${giftType}, ${coins}, CURRENT_TIMESTAMP)`;

      const sender = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true, displayName: true, avatarUrl: true } });

      // Broadcast gift to all viewers + the streamer
      const { wsHub, broadcastToStream } = await import("../ws");
      const giftEvent = {
        type: "live:gift",
        streamId: req.params.streamId,
        giftType,
        coins,
        sender: { username: sender?.username, displayName: sender?.displayName, avatarUrl: sender?.avatarUrl },
      };
      broadcastToStream(req.params.streamId, giftEvent);
      wsHub.send(stream.userId, giftEvent);

      return { ok: true, coins };
    }
  );
}
