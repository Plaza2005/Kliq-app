import { FastifyInstance } from "fastify";

export async function sessionRoutes(app: FastifyInstance) {
  // POST /sessions/start — called when user opens the app
  app.post<{ Body: { platform?: string } }>(
    "/start",
    { preHandler: [app.authenticate] },
    async (req) => {
      const session = await app.prisma.userSession.create({
        data: { userId: req.user.id, platform: req.body.platform ?? "web" },
      });
      return { sessionId: session.id };
    }
  );

  // POST /sessions/end — called on app close/blur
  app.post<{ Body: { sessionId: string } }>(
    "/end",
    { preHandler: [app.authenticate] },
    async (req) => {
      const session = await app.prisma.userSession.findFirst({
        where: { id: req.body.sessionId, userId: req.user.id, endedAt: null },
      });
      if (!session) return { ok: true };

      const durationS = Math.round((Date.now() - session.startedAt.getTime()) / 1000);
      await app.prisma.userSession.update({
        where: { id: session.id },
        data: { endedAt: new Date(), durationS },
      });
      return { ok: true, durationS };
    }
  );

  // POST /sessions/heartbeat — called every 60s to keep session alive
  app.post<{ Body: { sessionId: string } }>(
    "/heartbeat",
    { preHandler: [app.authenticate] },
    async (_req) => {
      // Just confirms the session exists; the actual duration is computed on /end
      return { ok: true };
    }
  );
}
