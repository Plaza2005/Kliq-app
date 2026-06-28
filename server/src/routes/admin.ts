import { FastifyInstance } from "fastify";
import * as fs from "fs";
import * as path from "path";

const SETTINGS_FILE = path.join(process.cwd(), "settings.json");

function readSettings(): Record<string, unknown> {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8"));
    }
  } catch { /* ignore */ }
  return {
    flags: {
      maintenance: false, registrations: true, klixtube: true,
      marketplace: true, live_streaming: true, amplify: true,
      communities: true, pro_verify: false, read_only: false,
    },
    limits: { post_len: 2200, uploads: 10, mkt_items: 50, stream_dur: 240 },
  };
}

function writeSettings(data: Record<string, unknown>) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

export async function adminRoutes(app: FastifyInstance) {
  // GET /admin/stats  (dashboard)
  app.get(
    "/stats",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const [
        totalUsers, activeUsers, bannedUsers, suspendedUsers,
        totalPosts, postsToday, totalNotifs,
        tierFree, tierPlus, tierPro,
      ] = await Promise.all([
        app.prisma.user.count(),
        app.prisma.user.count({ where: { status: "active" } }),
        app.prisma.user.count({ where: { status: "banned" } }),
        app.prisma.user.count({ where: { status: "suspended" } }),
        app.prisma.post.count({ where: { deletedAt: null } }),
        app.prisma.post.count({
          where: {
            deletedAt: null,
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        app.prisma.notification.count(),
        app.prisma.user.count({ where: { tier: "free" } }),
        app.prisma.user.count({ where: { tier: "plus" } }),
        app.prisma.user.count({ where: { tier: "pro" } }),
      ]);

      // Daily user counts for the past 7 days
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const userChart = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const next = new Date(date);
        next.setDate(next.getDate() + 1);
        const count = await app.prisma.user.count({
          where: { createdAt: { gte: date, lt: next } },
        });
        userChart.push({ day: days[date.getDay()], users: count, cumulative: totalUsers });
      }

      return {
        stats: {
          totalUsers,
          activeUsers,
          bannedUsers,
          suspendedUsers,
          totalPosts,
          postsToday,
          totalNotifs,
        },
        tiers: { free: tierFree, plus: tierPlus, pro: tierPro },
        userChart,
      };
    }
  );

  // GET /admin/users
  app.get<{ Querystring: { page?: string; status?: string; tier?: string; q?: string } }>(
    "/users",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const page   = parseInt(req.query.page || "1");
      const status = req.query.status;
      const tier   = req.query.tier;
      const q      = req.query.q;
      const take   = 20;

      const where: { status?: string; tier?: string; OR?: Array<{ username?: { contains: string }; email?: { contains: string }; displayName?: { contains: string } }> } = {};
      if (status && status !== "All") where.status = status.toLowerCase();
      if (tier   && tier   !== "All") where.tier   = tier.toLowerCase();
      if (q) {
        where.OR = [
          { username:    { contains: q } },
          { email:       { contains: q } },
          { displayName: { contains: q } },
        ];
      }

      const [users, total] = await Promise.all([
        app.prisma.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip: (page - 1) * take,
          select: {
            id: true, username: true, email: true, displayName: true,
            tier: true, status: true, isVerified: true, isAdmin: true,
            followerCount: true, postCount: true, createdAt: true, avatarUrl: true,
          },
        }),
        app.prisma.user.count({ where }),
      ]);

      return {
        users: users.map(u => ({
          ...u,
          avatarUrl: u.avatarUrl,
        })),
        total,
        page,
        pages: Math.ceil(total / take),
      };
    }
  );

  // PATCH /admin/users/:id  (ban, suspend, unban, change tier)
  app.patch<{ Params: { id: string }; Body: { action: string; tier?: string } }>(
    "/users/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req, reply) => {
      const { action, tier } = req.body;
      const userId = req.params.id;

      const user = await app.prisma.user.findUnique({ where: { id: userId } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      let updateData: Record<string, unknown> = {};
      if (action === "ban")     updateData = { status: "banned" };
      if (action === "suspend") updateData = { status: "suspended" };
      if (action === "unban")   updateData = { status: "active" };
      if (action === "verify")  updateData = { isVerified: true };
      if (action === "tier" && tier) updateData = { tier };

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({ error: "Unknown action" });
      }

      const updated = await app.prisma.user.update({ where: { id: userId }, data: updateData });

      await app.prisma.activityLog.create({
        data: {
          actorId: req.user.id,
          action:  `admin.${action}`,
          target:  user.username,
          details: JSON.stringify({ tier }),
        },
      });

      return {
        id:       updated.id,
        username: updated.username,
        status:   updated.status,
        tier:     updated.tier,
        isVerified: updated.isVerified,
      };
    }
  );

  // DELETE /admin/users/:id
  app.delete<{ Params: { id: string } }>(
    "/users/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { id: req.params.id } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      await app.prisma.activityLog.create({
        data: { actorId: req.user.id, action: "admin.delete_user", target: user.username },
      });

      await app.prisma.user.delete({ where: { id: req.params.id } });
      return { deleted: true };
    }
  );

  // GET /admin/content
  app.get<{ Querystring: { page?: string; type?: string } }>(
    "/content",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const take = 20;
      const type = req.query.type;

      const where: { deletedAt: null; postType?: string | { in: string[] } } = { deletedAt: null };
      if (type && type !== "All") {
        if (type === "social") where.postType = { in: ["post", "reel"] };
        else where.postType = type.toLowerCase();
      }

      const [posts, total] = await Promise.all([
        app.prisma.post.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take,
          skip: (page - 1) * take,
          include: {
            author: { select: { username: true, displayName: true, avatarUrl: true } },
          },
        }),
        app.prisma.post.count({ where }),
      ]);

      return {
        content: posts.map(p => ({
          id:           p.id,
          body:         p.body,
          mediaUrl:     p.mediaUrl,
          mediaType:    p.mediaType,
          postType:     p.postType,
          likeCount:    p.likeCount,
          commentCount: p.commentCount,
          viewCount:    p.viewCount,
          createdAt:    p.createdAt,
          author: {
            username:    p.author.username,
            displayName: p.author.displayName,
            avatarUrl:   p.author.avatarUrl,
          },
        })),
        total,
        page,
        pages: Math.ceil(total / take),
      };
    }
  );

  // DELETE /admin/content/:id
  app.delete<{ Params: { id: string } }>(
    "/content/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      // Soft-delete: mark as deleted so it disappears from feeds but the record is preserved
      await app.prisma.post.update({
        where: { id: req.params.id },
        data: { deletedAt: new Date() },
      });

      await app.prisma.activityLog.create({
        data: { actorId: req.user.id, action: "admin.remove_content", target: req.params.id },
      });

      return { deleted: true };
    }
  );

  // GET /admin/communities
  app.get(
    "/communities",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const communities = await app.prisma.community.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          creator: { select: { username: true, displayName: true } },
          _count: { select: { members: true, messages: true } },
        },
      });
      return communities.map(c => ({
        id:          c.id,
        name:        c.name,
        handle:      c.name.toLowerCase().replace(/\s+/g, "_"),
        description: c.description,
        owner:       c.creator.username,
        memberCount: c._count.members,
        postCount:   c._count.messages,
        createdAt:   c.createdAt,
        status:      (c.isPublic ? "Active" : "Suspended") as "Active" | "Suspended",
        featured:    false,
        avatarUrl:   c.avatarUrl ?? null,
      }));
    }
  );

  // POST /admin/notifications/broadcast
  app.post<{ Body: { title: string; message: string; audience: string } }>(
    "/notifications/broadcast",
    { preHandler: [app.authenticateAdmin] },
    async (req, reply) => {
      const { title, message, audience } = req.body;
      if (!title?.trim() || !message?.trim()) {
        return reply.status(400).send({ error: "Title and message are required" });
      }

      let userIds: string[] = [];
      if (audience === "tier2plus") {
        const rows = await app.prisma.user.findMany({ where: { status: "active", tier: { in: ["plus", "pro"] } }, select: { id: true } });
        userIds = rows.map(r => r.id);
      } else if (audience === "tier3") {
        const rows = await app.prisma.user.findMany({ where: { status: "active", tier: "pro" }, select: { id: true } });
        userIds = rows.map(r => r.id);
      } else if (audience === "new") {
        const since = new Date(); since.setDate(since.getDate() - 7);
        const rows = await app.prisma.user.findMany({ where: { status: "active", createdAt: { gte: since } }, select: { id: true } });
        userIds = rows.map(r => r.id);
      } else {
        const rows = await app.prisma.user.findMany({ where: { status: "active" }, select: { id: true } });
        userIds = rows.map(r => r.id);
      }

      const users = userIds.map(id => ({ id }));

      if (users.length > 0) {
        await app.prisma.notification.createMany({
          data: users.map(u => ({
            userId:     u.id,
            type:       "broadcast",
            actorName:  "KLIQ Team",
            message:    `${title}: ${message}`,
          })),
        });
      }

      await app.prisma.activityLog.create({
        data: {
          actorId: req.user.id,
          action:  "admin.broadcast",
          target:  audience,
          details: JSON.stringify({ title, message, recipients: users.length }),
        },
      });

      return { sent: true, recipients: users.length };
    }
  );

  // GET /admin/settings
  app.get(
    "/settings",
    { preHandler: [app.authenticateAdmin] },
    async () => readSettings()
  );

  // PATCH /admin/settings
  app.patch<{ Body: Record<string, unknown> }>(
    "/settings",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const current = readSettings();
      const updated = { ...current, ...req.body };
      writeSettings(updated);

      await app.prisma.activityLog.create({
        data: { actorId: req.user.id, action: "admin.settings_update", details: JSON.stringify(req.body) },
      });

      return updated;
    }
  );

  // GET /admin/users/:id/analytics — per-user analytics for the admin panel
  app.get<{ Params: { id: string } }>(
    "/users/:id/analytics",
    { preHandler: [app.authenticateAdmin] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true, username: true, email: true, displayName: true,
          avatarUrl: true, tier: true, status: true, isVerified: true,
          followerCount: true, followingCount: true, postCount: true,
          bio: true, createdAt: true, phone: true,
        },
      });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const posts = await app.prisma.post.findMany({
        where: { authorId: req.params.id, deletedAt: null },
        select: {
          id: true, postType: true, body: true, mediaUrl: true,
          likeCount: true, commentCount: true, viewCount: true, shareCount: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      const totalViews    = posts.reduce((s, p) => s + p.viewCount, 0);
      const totalLikes    = posts.reduce((s, p) => s + p.likeCount, 0);
      const totalComments = posts.reduce((s, p) => s + p.commentCount, 0);
      const totalShares   = posts.reduce((s, p) => s + p.shareCount, 0);

      const now = new Date();
      const byDay = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (6 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const dayPosts = posts.filter(p => p.createdAt.toISOString().slice(0, 10) === dateStr);
        return {
          name: d.toLocaleDateString("en-US", { weekday: "short" }),
          views: dayPosts.reduce((s, p) => s + p.viewCount, 0),
          likes: dayPosts.reduce((s, p) => s + p.likeCount, 0),
          posts: dayPosts.length,
        };
      });

      const topPosts = [...posts]
        .sort((a, b) => b.viewCount - a.viewCount)
        .slice(0, 5)
        .map(p => ({
          id: p.id, body: p.body, postType: p.postType, mediaUrl: p.mediaUrl,
          viewCount: p.viewCount, likeCount: p.likeCount, commentCount: p.commentCount,
        }));

      return {
        user: { ...user, avatarUrl: user.avatarUrl },
        totalViews, totalLikes, totalComments, totalShares,
        totalPosts: posts.length,
        byDay,
        topPosts,
        byType: {
          Social:      posts.filter(p => p.postType === "post" || p.postType === "reel").length,
          KliqTube:    posts.filter(p => p.postType === "tube").length,
          Stream:      posts.filter(p => p.postType === "stream").length,
          Marketplace: posts.filter(p => p.postType === "marketplace").length,
        },
      };
    }
  );

  // GET /admin/activity-log
  app.get<{ Querystring: { page?: string } }>(
    "/activity",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const logs = await app.prisma.activityLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 30,
        skip: (page - 1) * 30,
        include: {
          actor: { select: { username: true, displayName: true, avatarUrl: true } },
        },
      });

      return logs.map(l => ({
        id:        l.id,
        action:    l.action,
        target:    l.target,
        details:   l.details,
        ip:        l.ip,
        createdAt: l.createdAt,
        actor: l.actor ? {
          username:    l.actor.username,
          displayName: l.actor.displayName,
          avatarUrl:   l.actor.avatarUrl,
        } : null,
      }));
    }
  );

  // GET /admin/media-failures
  app.get(
    "/media-failures",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const logs = await app.prisma.activityLog.findMany({
        where:   { action: "media.failure" },
        orderBy: { createdAt: "desc" },
        take:    100,
        include: { actor: { select: { username: true } } },
      });
      return logs.map(l => ({
        id:        l.id,
        target:    l.target,
        details:   l.details,
        createdAt: l.createdAt,
        actor:     l.actor ? { username: l.actor.username } : null,
      }));
    }
  );

  // GET /admin/revenue/token-summary
  app.get(
    "/revenue/token-summary",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const [topupTxs, transferOutTxs, campaignBudgets, totalCampaigns, totalUsers, toppedUpWallets] =
        await Promise.all([
          app.prisma.walletTransaction.findMany({
            where: { type: "topup" },
            select: { amount: true },
          }),
          app.prisma.walletTransaction.findMany({
            where: { type: "transfer_out" },
            select: { amount: true },
          }),
          app.prisma.campaign.aggregate({ _sum: { budget: true } }),
          app.prisma.campaign.count(),
          app.prisma.user.count(),
          app.prisma.walletTransaction.findMany({
            where: { type: "topup" },
            distinct: ["walletId"],
            select: { walletId: true },
          }),
        ]);

      const totalIssued = topupTxs.reduce((s, t) => s + parseFloat(String(t.amount)), 0) * 110;
      const transferOutSum = transferOutTxs.reduce((s, t) => s + parseFloat(String(t.amount)), 0);
      const campaignBudgetSum = Number(campaignBudgets._sum.budget ?? 0);
      const totalSpent = transferOutSum + campaignBudgetSum;
      const inCirculation = totalIssued - totalSpent;

      return {
        totalIssued,
        totalSpent,
        inCirculation,
        totalCampaigns,
        totalUsers,
        toppedUpUsers: toppedUpWallets.length,
      };
    }
  );

  // GET /admin/revenue/token-breakdown
  app.get(
    "/revenue/token-breakdown",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const [campaignBudgets, transferOutTxs] = await Promise.all([
        app.prisma.campaign.aggregate({ _sum: { budget: true } }),
        app.prisma.walletTransaction.findMany({
          where: { type: "transfer_out" },
          select: { amount: true },
        }),
      ]);

      const amplifySumRaw = Number(campaignBudgets._sum.budget ?? 0);
      const transferSumRaw = transferOutTxs.reduce((s, t) => s + parseFloat(String(t.amount)), 0);

      return [
        { name: "Amplify", value: amplifySumRaw },
        { name: "Transfers", value: transferSumRaw },
        { name: "Other", value: 0 },
      ];
    }
  );

  // GET /admin/kliqstream/stats
  app.get(
    "/kliqstream/stats",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      const [total, pending, approved, rejected] = await Promise.all([
        app.prisma.kliqStreamTitle.count(),
        app.prisma.kliqStreamTitle.count({ where: { status: "pending" } }),
        app.prisma.kliqStreamTitle.count({ where: { status: "approved" } }),
        app.prisma.kliqStreamTitle.count({ where: { status: "rejected" } }),
      ]);
      return { total, pending, approved, rejected };
    }
  );

  // GET /admin/kliqstream/titles
  app.get<{ Querystring: { status?: string } }>(
    "/kliqstream/titles",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const where = req.query.status ? { status: req.query.status } : {};
      return app.prisma.kliqStreamTitle.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      });
    }
  );

  // PATCH /admin/kliqstream/titles/:id
  app.patch<{ Params: { id: string }; Body: { status?: string; isFeatured?: boolean; minTier?: string; rejectionReason?: string } }>(
    "/kliqstream/titles/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      return app.prisma.kliqStreamTitle.update({ where: { id: req.params.id }, data: req.body });
    }
  );

  // DELETE /admin/kliqstream/titles/:id
  app.delete<{ Params: { id: string } }>(
    "/kliqstream/titles/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      await app.prisma.kliqStreamTitle.delete({ where: { id: req.params.id } });
      return { ok: true };
    }
  );

  // GET /admin/analytics/sessions — overall session stats
  app.get("/analytics/sessions", { preHandler: [app.authenticateAdmin] }, async () => {
    // Total sessions (completed)
    const completed = await app.prisma.userSession.findMany({
      where: { durationS: { not: null } },
      select: { durationS: true, startedAt: true, userId: true },
    });

    const totalSessions = completed.length;
    const avgDurationS = totalSessions > 0
      ? Math.round(completed.reduce((sum, s) => sum + (s.durationS ?? 0), 0) / totalSessions)
      : 0;

    // Daily averages for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = completed.filter(s => s.startedAt >= thirtyDaysAgo);

    // Group by date
    const byDate: Record<string, number[]> = {};
    recent.forEach(s => {
      const d = s.startedAt.toISOString().slice(0, 10);
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(s.durationS ?? 0);
    });
    const dailyAvg = Object.entries(byDate)
      .map(([date, durations]) => ({
        date,
        avgDurationS: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
        sessions: durations.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Active sessions right now
    const activeSessions = await app.prisma.userSession.count({ where: { endedAt: null } });

    // Unique users in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dau = await app.prisma.userSession.groupBy({
      by: ["userId"],
      where: { startedAt: { gte: sevenDaysAgo } },
      _count: true,
    });

    return {
      avgDurationS,
      totalSessions,
      activeSessions,
      dau7: dau.length,
      dailyAvg,
    };
  });

  // GET /admin/users/:id/sessions — per-user session history
  app.get<{ Params: { id: string }; Querystring: { limit?: string } }>(
    "/users/:id/sessions",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const limit = parseInt(req.query.limit ?? "20");
      const sessions = await app.prisma.userSession.findMany({
        where: { userId: req.params.id },
        orderBy: { startedAt: "desc" },
        take: limit,
      });

      const completed = sessions.filter(s => s.durationS !== null);
      const avgDurationS = completed.length > 0
        ? Math.round(completed.reduce((sum, s) => sum + (s.durationS ?? 0), 0) / completed.length)
        : 0;

      return {
        avgDurationS,
        totalSessions: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          durationS: s.durationS,
          platform: s.platform,
        })),
      };
    }
  );

  // GET /admin/badge-requests
  app.get("/badge-requests", { preHandler: [app.authenticateAdmin] }, async () => {
    return app.prisma.badgeRequest.findMany({
      where: { status: "pending" },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      orderBy: { createdAt: "desc" },
    });
  });

  // PATCH /admin/badge-requests/:id
  app.patch<{ Params: { id: string }; Body: { status: "approved" | "rejected" } }>(
    "/badge-requests/:id", { preHandler: [app.authenticateAdmin] }, async (req) => {
      const req2 = await app.prisma.badgeRequest.update({ where: { id: req.params.id }, data: { status: req.body.status } });
      if (req.body.status === "approved") {
        await app.prisma.user.update({ where: { id: req2.userId }, data: { isVerified: true } });
      }
      return req2;
    }
  );

  // GET /admin/reports
  app.get("/reports", { preHandler: [app.authenticateAdmin] }, async () => {
    return app.prisma.report.findMany({
      include: {
        post: { include: { author: { select: { username: true, displayName: true, avatarUrl: true } } } },
        reporter: { select: { username: true, displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  // PATCH /admin/reports/:id — action a report (dismiss, remove_post, ban_user)
  app.patch<{ Params: { id: string }; Body: { action: "dismiss" | "remove_post" | "ban_user" } }>(
    "/reports/:id", { preHandler: [app.authenticateAdmin] }, async (req) => {
      const report = await app.prisma.report.findUnique({ where: { id: req.params.id }, include: { post: true } });
      if (!report) return { ok: true };
      if (req.body.action === "remove_post") {
        await app.prisma.post.update({ where: { id: report.postId }, data: { deletedAt: new Date() } });
      } else if (req.body.action === "ban_user") {
        await app.prisma.user.update({ where: { id: report.post.authorId }, data: { status: "banned" } });
      }
      return { ok: true };
    }
  );

  // GET /admin/user-reports
  app.get("/user-reports", { preHandler: [app.authenticateAdmin] }, async () => {
    return app.prisma.userReport.findMany({
      include: {
        reporter: { select: { username: true, displayName: true, avatarUrl: true } },
        target: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  });

  // PATCH /admin/user-reports/:id
  app.patch<{ Params: { id: string }; Body: { action: "dismiss" | "ban_user" } }>(
    "/user-reports/:id",
    { preHandler: [app.authenticateAdmin] },
    async (req) => {
      const report = await app.prisma.userReport.findUnique({ where: { id: req.params.id } });
      if (!report) return { ok: true };
      if (req.body.action === "ban_user") {
        await app.prisma.user.update({ where: { id: report.targetId }, data: { status: "banned" } });
      }
      return { ok: true };
    }
  );

  // GET /admin/messages/stats
  app.get("/messages/stats", { preHandler: [app.authenticateAdmin] }, async () => {
    const [totalThreads, totalMessages, activeToday] = await Promise.all([
      app.prisma.thread.count(),
      app.prisma.message.count({ where: { deletedAt: null } }),
      app.prisma.message.count({
        where: {
          deletedAt: null,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);
    return { totalThreads, totalMessages, activeToday };
  });

  // POST /admin/live/:streamId/terminate
  app.post<{ Params: { streamId: string } }>("/live/:streamId/terminate", { preHandler: [app.authenticateAdmin] }, async (req) => {
    await app.prisma.liveStream.updateMany({ where: { id: req.params.streamId }, data: { isLive: false, endedAt: new Date() } });
    const { clearStream } = await import("../ws");
    clearStream(req.params.streamId);
    return { ok: true };
  });

  // GET /admin/revenue/top-spenders
  app.get(
    "/revenue/top-spenders",
    { preHandler: [app.authenticateAdmin] },
    async () => {
      // Aggregate campaign budgets per user
      const campaignByUser = await app.prisma.campaign.groupBy({
        by: ["userId"],
        _sum: { budget: true },
        _count: { id: true },
      });

      // Aggregate transfer_out wallet transactions per user via wallet
      const wallets = await app.prisma.wallet.findMany({
        select: {
          userId: true,
          transactions: {
            where: { type: "transfer_out" },
            select: { amount: true },
          },
        },
      });

      // Build a map: userId -> { campaignBudget, campaignCount, transferOut }
      const spendMap = new Map<string, { campaignBudget: number; campaignCount: number; transferOut: number }>();

      for (const row of campaignByUser) {
        spendMap.set(row.userId, {
          campaignBudget: Number(row._sum.budget ?? 0),
          campaignCount:  row._count.id,
          transferOut:    0,
        });
      }

      for (const w of wallets) {
        const transferOut = w.transactions.reduce((s, t) => s + parseFloat(String(t.amount)), 0);
        if (transferOut > 0) {
          const existing = spendMap.get(w.userId);
          if (existing) {
            existing.transferOut += transferOut;
          } else {
            spendMap.set(w.userId, { campaignBudget: 0, campaignCount: 0, transferOut });
          }
        }
      }

      // Sort by total spend desc, take top 10
      const sorted = [...spendMap.entries()]
        .map(([userId, data]) => ({
          userId,
          tokensSpent:   data.campaignBudget + data.transferOut,
          campaignsRun:  data.campaignCount,
        }))
        .sort((a, b) => b.tokensSpent - a.tokensSpent)
        .slice(0, 10);

      if (sorted.length === 0) return [];

      const userIds = sorted.map(s => s.userId);
      const users = await app.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, avatarUrl: true, tier: true },
      });

      const userMap = new Map(users.map(u => [u.id, u]));

      return sorted.map((s, idx) => {
        const u = userMap.get(s.userId);
        return {
          userId:             s.userId,
          username:           u?.username ?? "Unknown",
          avatarUrl:          u?.avatarUrl,
          tier:               u?.tier ?? "free",
          tokensSpent:        s.tokensSpent,
          campaignsRun:       s.campaignsRun,
          revenueContributed: parseFloat((s.tokensSpent * 0.009).toFixed(2)),
          isMostActive:       idx === 0,
        };
      });
    }
  );
}
