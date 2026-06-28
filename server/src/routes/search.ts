import { FastifyInstance } from "fastify";

export async function searchRoutes(app: FastifyInstance) {
  // GET /search/trending
  app.get(
    "/trending",
    { preHandler: [app.authenticate] },
    async () => {
      const recent = await app.prisma.post.findMany({
        where: { deletedAt: null, body: { not: "" } },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: { body: true },
      });

      const tagCount: Record<string, number> = {};
      const tagRe = /#[\w]+/g;
      for (const p of recent) {
        const matches = p.body.match(tagRe) ?? [];
        for (const tag of matches) {
          const t = tag.toLowerCase();
          tagCount[t] = (tagCount[t] ?? 0) + 1;
        }
      }

      const sorted = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([tag, count]) => ({ tag, count }));

      if (sorted.length === 0) {
        return [
          { tag: "#kliq", count: 0 }, { tag: "#trending", count: 0 },
          { tag: "#music", count: 0 }, { tag: "#art", count: 0 },
          { tag: "#travel", count: 0 }, { tag: "#gaming", count: 0 },
        ];
      }

      return sorted;
    }
  );

  // GET /search/explore
  app.get<{ Querystring: { page?: string } }>(
    "/explore",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const posts = await app.prisma.post.findMany({
        where: { deletedAt: null, mediaUrl: { not: null } },
        orderBy: { likeCount: "desc" },
        take: 18,
        skip: (page - 1) * 18,
        select: {
          id: true, mediaUrl: true, mediaType: true,
          body: true, likeCount: true, commentCount: true,
          author: { select: { username: true } },
        },
      });
      return posts.map(p => ({
        id:           p.id,
        mediaUrl:     p.mediaUrl!,
        mediaType:    p.mediaType,
        body:         p.body,
        likeCount:    p.likeCount,
        commentCount: p.commentCount,
        author:       p.author,
      }));
    }
  );

  // GET /search/users?q=
  app.get<{ Querystring: { q?: string } }>(
    "/users",
    { preHandler: [app.authenticate] },
    async (req) => {
      const q = (req.query.q || "").trim();
      if (!q) return [];

      const users = await app.prisma.user.findMany({
        where: {
          OR: [
            { username:    { contains: q } },
            { displayName: { contains: q } },
          ],
          status: "active",
        },
        take: 20,
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, bio: true, isVerified: true,
          followerCount: true, tier: true,
        },
      });

      return users.map(u => ({
        ...u,
        avatarUrl: u.avatarUrl,
      }));
    }
  );

  // GET /search/posts?q=
  app.get<{ Querystring: { q?: string } }>(
    "/posts",
    { preHandler: [app.authenticate] },
    async (req) => {
      const q = (req.query.q || "").trim();
      if (!q) return [];

      const posts = await app.prisma.post.findMany({
        where: {
          body: { contains: q },
          deletedAt: null,
        },
        orderBy: { likeCount: "desc" },
        take: 20,
        include: {
          author: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      });

      return posts.map(p => ({
        id:           p.id,
        body:         p.body,
        mediaUrl:     p.mediaUrl,
        mediaType:    p.mediaType,
        postType:     p.postType,
        likeCount:    p.likeCount,
        commentCount: p.commentCount,
        createdAt:    p.createdAt,
        author: {
          username:    p.author.username,
          displayName: p.author.displayName,
          avatarUrl:   p.author.avatarUrl,
        },
      }));
    }
  );
}
