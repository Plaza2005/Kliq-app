import { FastifyInstance } from "fastify";

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /analytics/me — authenticated user's own stats + 7-day charts
  app.get("/me", { preHandler: [app.authenticate] }, async (req) => {
    const [posts, user] = await Promise.all([
      app.prisma.post.findMany({
        where: { authorId: req.user.id, deletedAt: null },
        select: {
          id: true, postType: true,
          likeCount: true, commentCount: true, viewCount: true, shareCount: true,
          createdAt: true,
        },
      }),
      app.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { followerCount: true, followingCount: true, postCount: true },
      }),
    ]);

    const totalViews    = posts.reduce((s, p) => s + p.viewCount, 0);
    const totalLikes    = posts.reduce((s, p) => s + p.likeCount, 0);
    const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);

    // 7-day breakdown (most-recent day last)
    const now = new Date();
    const byDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().slice(0, 10);
      const dayPosts = posts.filter(p => p.createdAt.toISOString().slice(0, 10) === dateStr);
      return {
        name:  d.toLocaleDateString("en-US", { weekday: "short" }),
        views: dayPosts.reduce((s, p) => s + p.viewCount, 0),
        likes: dayPosts.reduce((s, p) => s + p.likeCount, 0),
        posts: dayPosts.length,
      };
    });

    const byPlatform = {
      Social:      posts.filter(p => p.postType === "post" || p.postType === "reel").length,
      KliqTube:    posts.filter(p => p.postType === "tube").length,
      Stream:      posts.filter(p => p.postType === "stream").length,
      Marketplace: posts.filter(p => p.postType === "marketplace").length,
    };

    return {
      totalViews,
      totalLikes,
      totalComments,
      totalPosts:   user?.postCount ?? posts.length,
      followers:    user?.followerCount  ?? 0,
      following:    user?.followingCount ?? 0,
      byDay,
      byPlatform,
    };
  });

  // GET /analytics/admin/overview — platform-wide, admin only
  app.get("/admin/overview", { preHandler: [app.authenticateAdmin] }, async () => {
    const now  = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      return d;
    });

    const [allPosts, postsByDay, totalLikesAgg, totalViewsAgg, totalCommentsAgg, topCreators, topPosts] = await Promise.all([
      // All non-deleted posts
      app.prisma.post.findMany({
        where: { deletedAt: null },
        select: { postType: true, likeCount: true, viewCount: true, commentCount: true, createdAt: true },
      }),

      // Posts per day for each of last 7 days
      Promise.all(days.map(async d => {
        const next = new Date(d); next.setDate(next.getDate() + 1);
        const count = await app.prisma.post.count({
          where: { deletedAt: null, createdAt: { gte: d, lt: next } },
        });
        return {
          name:  d.toLocaleDateString("en-US", { weekday: "short" }),
          posts: count,
        };
      })),

      // Aggregate likes
      app.prisma.post.aggregate({ where: { deletedAt: null }, _sum: { likeCount: true } }),
      // Aggregate views
      app.prisma.post.aggregate({ where: { deletedAt: null }, _sum: { viewCount: true } }),
      // Aggregate comments
      app.prisma.post.aggregate({ where: { deletedAt: null }, _sum: { commentCount: true } }),

      // Top creators by followers
      app.prisma.user.findMany({
        orderBy: { followerCount: "desc" },
        take: 5,
        select: { username: true, displayName: true, avatarUrl: true, followerCount: true, postCount: true, tier: true },
      }),

      // Top posts by views
      app.prisma.post.findMany({
        where: { deletedAt: null },
        orderBy: { viewCount: "desc" },
        take: 5,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
      }),
    ]);

    const byType = {
      Social:      allPosts.filter(p => p.postType === "post" || p.postType === "reel").length,
      KliqTube:    allPosts.filter(p => p.postType === "tube").length,
      Stream:      allPosts.filter(p => p.postType === "stream").length,
      Marketplace: allPosts.filter(p => p.postType === "marketplace").length,
    };

    return {
      totalViews:    totalViewsAgg._sum.viewCount    ?? 0,
      totalLikes:    totalLikesAgg._sum.likeCount    ?? 0,
      totalComments: totalCommentsAgg._sum.commentCount ?? 0,
      totalPosts:    allPosts.length,
      byType,
      postsChart:    postsByDay,
      topCreators:   topCreators.map(u => ({
        ...u,
        avatarUrl: u.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
      })),
      topPosts: topPosts.map(p => ({
        id: p.id, body: p.body, postType: p.postType,
        viewCount: p.viewCount, likeCount: p.likeCount, commentCount: p.commentCount,
        author: {
          username:    p.author.username,
          displayName: p.author.displayName,
          avatarUrl:   p.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.author.username}`,
        },
      })),
    };
  });
}
