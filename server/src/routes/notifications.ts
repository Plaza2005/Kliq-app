import { FastifyInstance } from "fastify";
import { sendPushNotification } from "../firebase";

export async function notificationRoutes(app: FastifyInstance) {
  // GET /notifications
  app.get<{ Querystring: { page?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      // Non-blocking cleanup — fire and forget
      app.prisma.notification.deleteMany({
        where: { createdAt: { lt: twoDaysAgo } },
      }).catch(() => {});

      const notifs = await app.prisma.notification.findMany({
        where: { userId: req.user.id, createdAt: { gte: twoDaysAgo } },
        orderBy: { createdAt: "desc" },
        take: 30,
        skip: (page - 1) * 30,
      });

      const unreadCount = await app.prisma.notification.count({
        where: { userId: req.user.id, readAt: null, createdAt: { gte: twoDaysAgo } },
      });

      return {
        notifications: notifs.map(n => ({
          id:            n.id,
          type:          n.type,
          actorName:     n.actorName,
          actorUsername: n.actorUsername,
          actorAvatar:   n.actorAvatar,
          message:       n.message,
          targetId:      n.targetId,
          targetType:    n.targetType,
          readAt:        n.readAt,
          createdAt:     n.createdAt,
        })),
        unreadCount,
        page,
      };
    }
  );

  // DELETE /notifications/expired — delete all notifications older than 2 days (for cron)
  app.delete(
    "/expired",
    { preHandler: [app.authenticate] },
    async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const result = await app.prisma.notification.deleteMany({
        where: { createdAt: { lt: twoDaysAgo } },
      });
      return { deleted: result.count };
    }
  );

  // GET /notifications/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const notif = await app.prisma.notification.findFirst({
        where: { id: req.params.id, userId: req.user.id },
      });
      if (!notif) return reply.status(404).send({ error: "Not found" });
      return notif;
    }
  );

  // PATCH /notifications/read  (mark all read)
  app.patch(
    "/read",
    { preHandler: [app.authenticate] },
    async (req) => {
      await app.prisma.notification.updateMany({
        where: { userId: req.user.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }
  );

  // PATCH /notifications/:id/read
  app.patch<{ Params: { id: string } }>(
    "/:id/read",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const notif = await app.prisma.notification.findUnique({ where: { id: req.params.id } });
      if (!notif || notif.userId !== req.user.id) return reply.status(404).send({ error: "Not found" });
      await app.prisma.notification.update({ where: { id: req.params.id }, data: { readAt: new Date() } });
      return { ok: true };
    }
  );

  // POST /notifications/token — register or update FCM token for push notifications
  app.post<{ Body: { token: string } }>(
    "/token",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { token } = req.body;
      if (!token) return reply.status(400).send({ error: "token is required" });
      await app.prisma.user.update({ where: { id: req.user.id }, data: { fcmToken: token } });
      return { ok: true };
    }
  );

  // POST /notifications/test — send a test push notification to the current user
  app.post(
    "/test",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { fcmToken: true } });
      if (!user?.fcmToken) return reply.status(400).send({ error: "No FCM token registered" });
      await sendPushNotification(user.fcmToken, "Test Notification", "Push notifications are working!");
      return { ok: true };
    }
  );
}
