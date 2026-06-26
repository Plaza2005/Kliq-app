import { FastifyInstance } from "fastify";

export async function bookmarkRoutes(app: FastifyInstance) {
  // POST /bookmarks/:postId
  app.post<{ Params: { postId: string } }>("/:postId", { preHandler: [app.authenticate] }, async (req) => {
    await app.prisma.bookmark.upsert({
      where: { userId_postId: { userId: req.user.id, postId: req.params.postId } },
      create: { userId: req.user.id, postId: req.params.postId },
      update: {},
    });
    return { bookmarked: true };
  });

  // DELETE /bookmarks/:postId
  app.delete<{ Params: { postId: string } }>("/:postId", { preHandler: [app.authenticate] }, async (req) => {
    await app.prisma.bookmark.deleteMany({ where: { userId: req.user.id, postId: req.params.postId } });
    return { bookmarked: false };
  });

  // GET /bookmarks — user's saved posts
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    const bookmarks = await app.prisma.bookmark.findMany({
      where: { userId: req.user.id },
      include: { post: { include: { author: { select: { username: true, displayName: true, avatarUrl: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return bookmarks.map(b => ({ ...b.post, bookmarkedAt: b.createdAt, author: { ...b.post.author, avatarUrl: b.post.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${b.post.author.username}` } }));
  });
}
