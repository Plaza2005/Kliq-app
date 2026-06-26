import { FastifyInstance } from "fastify";

export async function soundRoutes(app: FastifyInstance) {
  // GET /sounds/trending
  app.get("/trending", { preHandler: [app.authenticate] }, async () => {
    return app.prisma.sound.findMany({
      orderBy: { useCount: "desc" },
      take: 30,
      include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
  });

  // GET /sounds/search?q=
  app.get<{ Querystring: { q?: string } }>("/search", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.sound.findMany({
      where: req.query.q ? { title: { contains: req.query.q } } : {},
      orderBy: { useCount: "desc" },
      take: 20,
      include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
    });
  });

  // POST /sounds — upload a sound
  app.post<{ Body: { title: string; audioUrl: string; coverUrl?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req) => {
      return app.prisma.sound.create({
        data: {
          title: req.body.title,
          audioUrl: req.body.audioUrl,
          coverUrl: req.body.coverUrl,
          authorId: req.user.id,
        },
      });
    }
  );

  // GET /sounds/:id/posts — posts using this sound
  app.get<{ Params: { id: string } }>("/:id/posts", { preHandler: [app.authenticate] }, async (req) => {
    const ps = await app.prisma.postSound.findMany({
      where: { soundId: req.params.id },
      include: {
        post: {
          include: {
            author: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        },
      },
      take: 20,
    });
    return ps.map((p) => p.post);
  });
}
