import { FastifyInstance } from "fastify";

export async function hashtagRoutes(app: FastifyInstance) {
  // GET /hashtags/trending
  app.get("/trending", { preHandler: [app.authenticate] }, async () => {
    return app.prisma.hashtag.findMany({ orderBy: { postCount: "desc" }, take: 20 });
  });

  // GET /hashtags/:name/posts
  app.get<{ Params: { name: string } }>("/:name/posts", { preHandler: [app.authenticate] }, async (req) => {
    const hashtag = await app.prisma.hashtag.findUnique({ where: { name: req.params.name.toLowerCase() } });
    if (!hashtag) return [];
    const postHashtags = await app.prisma.postHashtag.findMany({
      where: { hashtagId: hashtag.id },
      include: { post: { include: { author: { select: { username: true, displayName: true, avatarUrl: true } } } } },
      orderBy: { post: { likeCount: "desc" } },
      take: 30,
    });
    return postHashtags.map(ph => ph.post);
  });
}
