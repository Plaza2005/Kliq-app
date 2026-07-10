import { FastifyInstance } from "fastify";

const RANGE_DAYS: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30, "90d": 90 };

export async function analyticsRoutes(app: FastifyInstance) {
  // GET /analytics/me?range=24h|7d|30d|90d — authenticated user's own stats + charts
  app.get<{ Querystring: { range?: string } }>("/me", { preHandler: [app.authenticate] }, async (req) => {
    const rangeDays = RANGE_DAYS[req.query.range ?? "7d"] ?? 7;

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

    const now = new Date();
    const since = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const rangePosts = posts.filter(p => p.createdAt >= since);

    // Time-bucket breakdown (most-recent bucket last).
    // 24h → hourly buckets; otherwise daily buckets.
    let byDay: { name: string; views: number; likes: number; posts: number }[];
    if (rangeDays === 1) {
      byDay = Array.from({ length: 24 }, (_, i) => {
        const start = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
        start.setMinutes(0, 0, 0);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        const bucket = posts.filter(p => p.createdAt >= start && p.createdAt < end);
        return {
          name:  start.toLocaleTimeString("en-US", { hour: "numeric", hour12: true }),
          views: bucket.reduce((s, p) => s + p.viewCount, 0),
          likes: bucket.reduce((s, p) => s + p.likeCount, 0),
          posts: bucket.length,
        };
      });
    } else {
      byDay = Array.from({ length: rangeDays }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (rangeDays - 1 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const dayPosts = posts.filter(p => p.createdAt.toISOString().slice(0, 10) === dateStr);
        return {
          name: rangeDays <= 7
            ? d.toLocaleDateString("en-US", { weekday: "short" })
            : d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          views: dayPosts.reduce((s, p) => s + p.viewCount, 0),
          likes: dayPosts.reduce((s, p) => s + p.likeCount, 0),
          posts: dayPosts.length,
        };
      });
    }

    const byPlatform = {
      Social:      posts.filter(p => p.postType === "post" || p.postType === "reel").length,
      KliqTube:    posts.filter(p => p.postType === "tube").length,
      Stream:      posts.filter(p => p.postType === "stream").length,
      Marketplace: posts.filter(p => p.postType === "marketplace").length,
    };

    // Per-content-type breakdown within the selected range
    const TYPE_GROUPS: { name: string; match: (t: string) => boolean }[] = [
      { name: "Posts",       match: t => t === "post" },
      { name: "Reels",       match: t => t === "reel" },
      { name: "KliqTube",    match: t => t === "tube" },
      { name: "Stream",      match: t => t === "stream" },
      { name: "Marketplace", match: t => t === "marketplace" },
    ];
    const byType = TYPE_GROUPS.map(g => {
      const group = rangePosts.filter(p => g.match(p.postType));
      return {
        name:     g.name,
        posts:    group.length,
        views:    group.reduce((s, p) => s + p.viewCount, 0),
        likes:    group.reduce((s, p) => s + p.likeCount, 0),
        comments: group.reduce((s, p) => s + p.commentCount, 0),
        shares:   group.reduce((s, p) => s + p.shareCount, 0),
      };
    });

    // Engagement summary (all-time)
    const postCount = posts.length;
    const engagement = {
      avgViewsPerPost:    postCount > 0 ? Math.round(totalViews / postCount) : 0,
      avgLikesPerPost:    postCount > 0 ? Math.round((totalLikes / postCount) * 10) / 10 : 0,
      avgCommentsPerPost: postCount > 0 ? Math.round((totalComments / postCount) * 10) / 10 : 0,
      // (likes + comments) / views, as a percentage
      engagementRate: totalViews > 0
        ? Math.round(((totalLikes + totalComments) / totalViews) * 1000) / 10
        : 0,
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
      byType,
      engagement,
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
        avatarUrl: u.avatarUrl,
      })),
      topPosts: topPosts.map(p => ({
        id: p.id, body: p.body, postType: p.postType,
        viewCount: p.viewCount, likeCount: p.likeCount, commentCount: p.commentCount,
        author: {
          username:    p.author.username,
          displayName: p.author.displayName,
          avatarUrl:   p.author.avatarUrl,
        },
      })),
    };
  });
}
