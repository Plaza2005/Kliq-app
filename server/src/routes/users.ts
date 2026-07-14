import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";
import { sendPushNotification } from "../firebase";

export async function userRoutes(app: FastifyInstance) {
  // GET /users/suggested
  app.get(
    "/suggested",
    { preHandler: [app.authenticate] },
    async (req) => {
      const following = await app.prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      });
      const followingIds = following.map(f => f.followingId);
      const excluded = [...followingIds, req.user.id];

      const users = await app.prisma.user.findMany({
        where: { id: { notIn: excluded }, status: "active" },
        orderBy: { followerCount: "desc" },
        take: 10,
        select: {
          id: true, username: true, displayName: true,
          avatarUrl: true, bio: true, isVerified: true, followerCount: true,
        },
      });

      return users.map(u => ({
        ...u,
        avatarUrl: u.avatarUrl,
      }));
    }
  );

  // GET /users/search?q=
  app.get<{ Querystring: { q?: string } }>(
    "/search",
    { preHandler: [app.authenticate] },
    async (req) => {
      const q = (req.query.q ?? "").trim();
      if (!q) return [];
      const users = await app.prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q } },
            { displayName: { contains: q } },
          ],
          status: { not: "banned" },
        },
        select: {
          id: true, username: true, displayName: true, avatarUrl: true,
          bio: true, isVerified: true, followerCount: true, tier: true,
        },
        take: 20,
        orderBy: { followerCount: "desc" },
      });
      return users.map(u => ({
        ...u,
        avatarUrl: u.avatarUrl,
      }));
    }
  );

  // GET /users/:username  (also accepts user ID as the param for legacy chat URLs)
  app.get<{ Params: { username: string } }>(
    "/:username",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const param = req.params.username;
      // Try by username first; fall back to ID so that /users/<cuid> still resolves
      const user = await app.prisma.user.findFirst({
        where: { OR: [{ username: param }, { id: param }] },
        include: { liveStream: { select: { isLive: true, title: true } } },
      });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const [isFollowing, subscription] = await Promise.all([
        app.prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: req.user.id, followingId: user.id } },
        }),
        user.subPrice ? app.prisma.creatorSubscription.findUnique({
          where: { subscriberId_creatorId: { subscriberId: req.user.id, creatorId: user.id } },
        }) : Promise.resolve(null),
      ]);
      const isSubscribed = subscription && (!subscription.expiresAt || subscription.expiresAt > new Date());

      return {
        id:            user.id,
        username:      user.username,
        displayName:   user.displayName,
        bio:           user.bio,
        avatarUrl:     user.avatarUrl,
        coverUrl:      user.coverUrl,
        tier:          user.tier,
        isVerified:    user.isVerified,
        isOnboarded:   user.isOnboarded,
        status:        user.status,
        followerCount: user.followerCount,
        followingCount:user.followingCount,
        postCount:     user.postCount,
        createdAt:     user.createdAt,
        isFollowing:   !!isFollowing,
        isOwnProfile:  user.id === req.user.id,
        isLive:        user.liveStream?.isLive ?? false,
        liveStreamTitle: user.liveStream?.title ?? null,
        subPrice:      user.subPrice ?? null,
        isSubscribed:  !!isSubscribed,
      };
    }
  );

  // GET /users/:username/posts
  app.get<{ Params: { username: string }; Querystring: { page?: string; type?: string } }>(
    "/:username/posts",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const page = parseInt(req.query.page || "1");
      const postType = req.query.type || "post";
      const posts = await app.prisma.post.findMany({
        where: { authorId: user.id, deletedAt: null, postType },
        orderBy: { createdAt: "desc" },
        take: 12,
        skip: (page - 1) * 12,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
      });

      const myLikes = await app.prisma.like.findMany({
        where: { userId: req.user.id, targetId: { in: posts.map(p => p.id) }, targetType: "post" },
      });
      const likedSet = new Set(myLikes.map(l => l.targetId));

      // Sort pinned posts to top (pinnedAt not in Prisma client, read as any)
      const sorted = [...posts].sort((a, b) => {
        const ap = (a as unknown as { pinnedAt: Date | null }).pinnedAt;
        const bp = (b as unknown as { pinnedAt: Date | null }).pinnedAt;
        if (ap && !bp) return -1;
        if (!ap && bp) return 1;
        return 0;
      });

      return sorted.map(p => ({ ...mapPost(p, likedSet), pinnedAt: (p as unknown as { pinnedAt: Date | null }).pinnedAt ?? null }));
    }
  );

  // GET /users/:username/followers
  app.get<{ Params: { username: string } }>(
    "/:username/followers",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const follows = await app.prisma.follow.findMany({
        where: { followingId: user.id },
        include: { follower: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return follows.map(f => ({
        id:          f.follower.id,
        username:    f.follower.username,
        displayName: f.follower.displayName,
        avatarUrl:   f.follower.avatarUrl,
        bio:         f.follower.bio,
        isVerified:  f.follower.isVerified,
      }));
    }
  );

  // GET /users/:username/following
  app.get<{ Params: { username: string } }>(
    "/:username/following",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const follows = await app.prisma.follow.findMany({
        where: { followerId: user.id },
        include: { following: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return follows.map(f => ({
        id:          f.following.id,
        username:    f.following.username,
        displayName: f.following.displayName,
        avatarUrl:   f.following.avatarUrl,
        bio:         f.following.bio,
        isVerified:  f.following.isVerified,
      }));
    }
  );

  // GET /users/:username/reposts
  app.get<{ Params: { username: string } }>(
    "/:username/reposts",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });

      const repostLikes = await app.prisma.like.findMany({
        where: { userId: user.id, targetType: "repost" },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      if (repostLikes.length === 0) return [];

      const postIds = repostLikes.map(r => r.targetId);
      const posts = await app.prisma.post.findMany({
        where: { id: { in: postIds }, deletedAt: null },
        include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
      });

      return posts.map(p => ({
        id:         p.id,
        body:       p.body,
        mediaUrl:   p.mediaUrl,
        postType:   p.postType,
        likeCount:  p.likeCount,
        viewCount:  p.viewCount,
        author: {
          username:    p.author.username,
          displayName: p.author.displayName,
          avatarUrl:   p.author.avatarUrl,
        },
      }));
    }
  );

  // GET /users/:username/playlists
  app.get<{ Params: { username: string } }>(
    "/:username/playlists",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!user) return reply.status(404).send({ error: "User not found" });
      const playlists = await app.prisma.kliqPlaylist.findMany({
        where: { userId: user.id },
        include: { _count: { select: { items: true } } },
        orderBy: { createdAt: "desc" },
      });
      return playlists.map(pl => ({
        id: pl.id,
        name: pl.name,
        itemCount: pl._count.items,
        createdAt: pl.createdAt,
      }));
    }
  );

  // POST /users/:username/follow
  app.post<{ Params: { username: string } }>(
    "/:username/follow",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const target = await app.prisma.user.findFirst({
        where: { OR: [{ username: req.params.username }, { id: req.params.username }] },
      });
      if (!target) return reply.status(404).send({ error: "User not found" });
      if (target.id === req.user.id) return reply.status(400).send({ error: "Cannot follow yourself" });

      const existing = await app.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: req.user.id, followingId: target.id } },
      });
      if (existing) return { following: true };

      await app.prisma.follow.create({ data: { followerId: req.user.id, followingId: target.id } });
      await app.prisma.user.update({ where: { id: req.user.id }, data: { followingCount: { increment: 1 } } });
      await app.prisma.user.update({ where: { id: target.id }, data: { followerCount: { increment: 1 } } });

      const [me, targetUser] = await Promise.all([
        app.prisma.user.findUnique({ where: { id: req.user.id }, select: { displayName: true, username: true, avatarUrl: true } }),
        app.prisma.user.findUnique({ where: { id: target.id }, select: { fcmToken: true } }),
      ]);
      const notif = await app.prisma.notification.create({
        data: {
          userId:        target.id,
          type:          "follow",
          actorName:     me?.displayName ?? "Someone",
          actorUsername: me?.username ?? null,
          actorAvatar:   me?.avatarUrl,
          message:       "started following you",
          targetId:      req.user.id,
          targetType:    "user",
        },
      });
      wsHub.send(target.id, { type: "notification:new", notification: {
        id: notif.id, type: notif.type, actorName: notif.actorName,
        actorUsername: notif.actorUsername,
        actorAvatar: notif.actorAvatar,
        message: notif.message, targetId: notif.targetId, targetType: notif.targetType,
        readAt: null, createdAt: notif.createdAt.toISOString(),
      } });
      if (targetUser?.fcmToken) {
        sendPushNotification(targetUser.fcmToken, `${me?.displayName ?? "Someone"} followed you`, "").catch(() => {});
      }

      return { following: true };
    }
  );

  // GET /users/me — own profile settings (showWalletBalance etc.)
  app.get("/me", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { showWalletBalance: true, subPrice: true },
    });
    if (!user) return reply.status(404).send({ error: "User not found" });
    return user;
  });

  // POST /users/me/badge-request
  app.post<{ Body: { reason: string } }>("/me/badge-request", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.badgeRequest.create({ data: { userId: req.user.id, reason: req.body.reason } });
  });

  // POST /users/me/onboarding
  app.post<{ Body: { interests: string[] } }>("/me/onboarding", { preHandler: [app.authenticate] }, async (req) => {
    await app.prisma.userInterest.deleteMany({ where: { userId: req.user.id } });
    if (req.body.interests.length > 0) {
      await app.prisma.userInterest.createMany({
        data: req.body.interests.map(cat => ({ userId: req.user.id, category: cat })),
        skipDuplicates: true,
      });
    }
    return app.prisma.user.update({ where: { id: req.user.id }, data: { isOnboarded: true } });
  });

  // GET /users/me/marketplace — own marketplace listings
  app.get("/me/marketplace", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.post.findMany({
      where: { authorId: req.user.id, postType: "marketplace", deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, body: true, mediaUrl: true, thumbUrl: true, viewCount: true, likeCount: true, createdAt: true, isPaylocked: true, payPrice: true },
    });
  });

  // POST /users/me/tier-upgrade
  app.post<{ Body: { tier: string } }>(
    "/me/tier-upgrade",
    { preHandler: [app.authenticate] },
    async (req) => {
      return app.prisma.user.update({ where: { id: req.user.id }, data: { tier: req.body.tier } });
    }
  );

  // PATCH /users/me/settings
  app.patch<{ Body: { showWalletBalance?: boolean } }>(
    "/me/settings",
    { preHandler: [app.authenticate] },
    async (req) => {
      return app.prisma.user.update({ where: { id: req.user.id }, data: req.body });
    }
  );

  // POST /users/:username/report
  app.post<{ Params: { username: string }; Body: { reason: string } }>(
    "/:username/report",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!target) return reply.status(404).send({ error: "User not found" });
      return app.prisma.userReport.create({
        data: { reporterId: req.user.id, targetId: target.id, reason: req.body.reason },
      });
    }
  );

  // GET /users/me/blocked — list blocked users (full profiles)
  app.get("/me/blocked", { preHandler: [app.authenticate] }, async (req) => {
    const blocks = await app.prisma.block.findMany({
      where: { blockerId: req.user.id },
      include: { blocked: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    return blocks.map((b) => ({
      ...b.blocked,
      avatarUrl:
        b.blocked.avatarUrl ??
        "/avatar-default.svg",
      blockedAt: (b as unknown as { createdAt: Date }).createdAt,
    }));
  });

  // GET /users/me/muted
  app.get("/me/muted", { preHandler: [app.authenticate] }, async (req) => {
    const mutes = await app.prisma.mute.findMany({
      where: { muterId: req.user.id },
      include: { muted: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    return mutes.map((m) => ({
      ...m.muted,
      avatarUrl:
        m.muted.avatarUrl ??
        "/avatar-default.svg",
    }));
  });

  // PATCH /users/me/privacy — update privacy settings
  app.patch<{ Body: { whoCanMessage?: string; whoCanSeeFollowers?: string } }>(
    "/me/privacy",
    { preHandler: [app.authenticate] },
    async (req) => {
      const current = await app.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { privacySettings: true },
      });
      const existing = current?.privacySettings ? JSON.parse(current.privacySettings) : {};
      const updated = { ...existing, ...req.body };
      return app.prisma.user.update({
        where: { id: req.user.id },
        data: { privacySettings: JSON.stringify(updated) },
      });
    }
  );

  // PATCH /users/me/notif-prefs
  app.patch<{
    Body: { likes?: boolean; comments?: boolean; follows?: boolean; tips?: boolean; messages?: boolean };
  }>(
    "/me/notif-prefs",
    { preHandler: [app.authenticate] },
    async (req) => {
      const current = await app.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { notifPrefs: true },
      });
      const existing = current?.notifPrefs ? JSON.parse(current.notifPrefs) : {};
      const updated = { ...existing, ...req.body };
      return app.prisma.user.update({
        where: { id: req.user.id },
        data: { notifPrefs: JSON.stringify(updated) },
      });
    }
  );

  // POST /users/match-contacts — find KLIQ users among a device's contacts.
  // Contacts are never persisted; phones/emails only live for this request.
  app.post<{ Body: { phones?: string[]; emails?: string[] } }>(
    "/match-contacts",
    { preHandler: [app.authenticate] },
    async (req) => {
      const rawPhones = Array.isArray(req.body?.phones) ? req.body.phones.slice(0, 2000) : [];
      const rawEmails = Array.isArray(req.body?.emails) ? req.body.emails.slice(0, 2000) : [];

      // email -> normalized email (trim+lowercase)
      const emailByNormalized = new Map<string, string>();
      for (const raw of rawEmails) {
        if (typeof raw !== "string") continue;
        const normalized = raw.trim().toLowerCase();
        if (normalized && !emailByNormalized.has(normalized)) {
          emailByNormalized.set(normalized, raw);
        }
      }

      // last-9-digits suffix -> original phone string
      const phoneBySuffix = new Map<string, string>();
      for (const raw of rawPhones) {
        if (typeof raw !== "string") continue;
        const digits = raw.replace(/\D/g, "");
        if (digits.length < 7) continue;
        const suffix = digits.slice(-9);
        if (!phoneBySuffix.has(suffix)) phoneBySuffix.set(suffix, raw);
      }

      const normalizedEmails = [...emailByNormalized.keys()];
      const [byEmail, byPhone] = await Promise.all([
        normalizedEmails.length > 0
          ? app.prisma.user.findMany({
              where: { email: { in: normalizedEmails }, status: { not: "banned" } },
              select: {
                id: true, username: true, displayName: true,
                avatarUrl: true, isVerified: true, phone: true, email: true,
              },
            })
          : Promise.resolve([]),
        phoneBySuffix.size > 0
          ? app.prisma.user.findMany({
              where: { phone: { not: null }, status: { not: "banned" } },
              select: {
                id: true, username: true, displayName: true,
                avatarUrl: true, isVerified: true, phone: true, email: true,
              },
            })
          : Promise.resolve([]),
      ]);

      const following = await app.prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      });
      const followingIds = new Set(following.map(f => f.followingId));

      const matched = new Map<string, { user: typeof byEmail[number]; matchedOn: string }>();

      for (const u of byEmail) {
        if (u.id === req.user.id || matched.has(u.id)) continue;
        const original = emailByNormalized.get(u.email.trim().toLowerCase());
        if (original) matched.set(u.id, { user: u, matchedOn: original });
      }

      for (const u of byPhone) {
        if (u.id === req.user.id || matched.has(u.id) || !u.phone) continue;
        const digits = u.phone.replace(/\D/g, "");
        if (digits.length < 7) continue;
        const suffix = digits.slice(-9);
        const original = phoneBySuffix.get(suffix);
        if (original) matched.set(u.id, { user: u, matchedOn: original });
      }

      return [...matched.values()].map(({ user, matchedOn }) => ({
        id:           user.id,
        username:     user.username,
        displayName:  user.displayName,
        avatarUrl:    user.avatarUrl,
        isVerified:   user.isVerified,
        isFollowing:  followingIds.has(user.id),
        matchedOn,
      }));
    }
  );

  // DELETE /users/:username/follow
  app.delete<{ Params: { username: string } }>(
    "/:username/follow",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const target = await app.prisma.user.findFirst({
        where: { OR: [{ username: req.params.username }, { id: req.params.username }] },
      });
      if (!target) return reply.status(404).send({ error: "User not found" });

      const deleted = await app.prisma.follow.deleteMany({
        where: { followerId: req.user.id, followingId: target.id },
      });
      if (deleted.count > 0) {
        await Promise.all([
          app.prisma.user.update({ where: { id: req.user.id }, data: { followingCount: { decrement: 1 } } }),
          app.prisma.user.update({ where: { id: target.id }, data: { followerCount: { decrement: 1 } } }),
        ]);
      }

      return { following: false };
    }
  );
}

function mapPost(p: { id: string; body: string; mediaUrl: string | null; mediaType: string | null; thumbUrl?: string | null; postType: string; likeCount: number; commentCount: number; shareCount: number; viewCount: number; createdAt: Date; author: { username: string; displayName: string; avatarUrl: string | null } }, likedSet: Set<string>) {
  return {
    id:           p.id,
    body:         p.body,
    mediaUrl:     p.mediaUrl,
    mediaType:    p.mediaType,
    thumbUrl:     p.thumbUrl ?? null,
    postType:     p.postType,
    likeCount:    p.likeCount,
    commentCount: p.commentCount,
    shareCount:   p.shareCount,
    viewCount:    p.viewCount,
    createdAt:    p.createdAt,
    liked:        likedSet.has(p.id),
    author: {
      username:    p.author.username,
      displayName: p.author.displayName,
      avatarUrl:   p.author.avatarUrl,
    },
  };
}
