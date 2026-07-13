import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";
import { sendPushNotification } from "../firebase";

export async function postRoutes(app: FastifyInstance) {
  // GET /posts/feed
  app.get<{ Querystring: { page?: string; tab?: string } }>(
    "/feed",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const tab  = req.query.tab || "for_you";
      const take = 10;
      const skip = (page - 1) * take;

      let posts;
      if (tab === "following") {
        const following = await app.prisma.follow.findMany({
          where: { followerId: req.user.id },
          select: { followingId: true },
        });
        const ids = following.map(f => f.followingId);
        posts = await app.prisma.post.findMany({
          where: { authorId: { in: ids }, deletedAt: null, postType: "post" },
          orderBy: { createdAt: "desc" },
          take, skip,
          include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
        });
      } else {
        // ── TikTok-style For You ──────────────────────────────────────────────
        // Three-signal ranking: engagement score + completion rate + interest affinity
        // Plus 20% seed slots for fresh posts (<48h, <50 views) to give new creators a push
        const [candidates, userInterests] = await Promise.all([
          app.prisma.post.findMany({
            where: { deletedAt: null, postType: { in: ["post", "reel", "carousel"] }, status: "published" },
            orderBy: { createdAt: "desc" },
            take: Math.min(skip + take * 5, 200),
            include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
          }),
          // Fetch user's top interest categories via raw query (score field not in generated client)
          app.prisma.$queryRaw<{ category: string; score: number }[]>`
            SELECT "category", "score" FROM "UserInterest"
            WHERE "userId" = ${req.user.id}
            ORDER BY "score" DESC LIMIT 8
          `,
        ]);

        const interestTags = new Set(userInterests.map(i => i.category.toLowerCase()));
        const now = Date.now();
        const FORTY_EIGHT_H = 48 * 3600 * 1000;

        // Split into seed pool (fresh, low-view posts for new creator exposure) and main pool
        const seedPool = candidates.filter(p => {
          const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
          return (now - p.createdAt.getTime()) < FORTY_EIGHT_H && p.viewCount < 50 && cv < 10;
        });
        const mainPool = candidates.filter(p => !seedPool.includes(p));

        const scorePost = (p: typeof candidates[0]) => {
          const ageDays = (now - p.createdAt.getTime()) / 86400000;
          const recencyBoost = Math.max(0, 1 - ageDays / 14);
          const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
          // Extract hashtags from body and check against user interests
          const tags = (p.body.match(/#(\w+)/g) ?? []).map(t => t.slice(1).toLowerCase());
          const interestBonus = tags.some(t => interestTags.has(t)) ? 30 : 0;
          return (
            p.likeCount * 3 +
            p.commentCount * 5 +
            (p as unknown as { shareCount: number }).shareCount * 4 +
            p.viewCount * 0.1 +
            cv * 15 +          // completion rate is TikTok's #1 signal
            recencyBoost * 50 +
            interestBonus
          );
        };

        // Score and sort main pool
        const scoredMain = mainPool
          .map(p => ({ ...p, _score: scorePost(p) }))
          .sort((a, b) => b._score - a._score);

        // Randomly sample seed pool (shuffle so same seeds don't always appear)
        const shuffledSeed = seedPool
          .map(p => ({ ...p, _score: scorePost(p), _isSeed: true }))
          .sort(() => Math.random() - 0.5);

        // Interleave: 1 seed slot per 5 results (20%), fill remaining from main pool
        const result: typeof scoredMain = [];
        let mainIdx = 0;
        let seedIdx = 0;
        for (let i = 0; i < skip + take; i++) {
          if (i % 5 === 4 && seedIdx < shuffledSeed.length) {
            result.push(shuffledSeed[seedIdx++] as typeof scoredMain[0]);
          } else if (mainIdx < scoredMain.length) {
            result.push(scoredMain[mainIdx++]);
          } else if (seedIdx < shuffledSeed.length) {
            result.push(shuffledSeed[seedIdx++] as typeof scoredMain[0]);
          }
        }

        posts = result.slice(skip, skip + take);
      }

      const postIds = posts.map(p => p.id);
      const [myLikes, myReposts] = await Promise.all([
        app.prisma.like.findMany({ where: { userId: req.user.id, targetId: { in: postIds }, targetType: "post" } }),
        app.prisma.like.findMany({ where: { userId: req.user.id, targetId: { in: postIds }, targetType: "repost" } }),
      ]);
      const likedSet    = new Set(myLikes.map(l => l.targetId));
      const repostedSet = new Set(myReposts.map(r => r.targetId));

      return { posts: posts.map(p => mapPost(p, likedSet, repostedSet)), page, hasMore: posts.length === take };
    }
  );

  // GET /posts/search?q=
  app.get<{ Querystring: { q?: string; type?: string } }>(
    "/search",
    { preHandler: [app.authenticate] },
    async (req) => {
      const q = req.query.q ?? "";
      if (!q) return [];
      return app.prisma.post.findMany({
        where: {
          body: { contains: q },
          deletedAt: null,
          ...(req.query.type ? { postType: req.query.type } : {}),
        },
        orderBy: { likeCount: "desc" },
        take: 20,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
      });
    }
  );

  // GET /posts/reels  (reels feed — TikTok-style For You ranking; tab=following
  // restricts to reels from accounts the viewer follows)
  app.get<{ Querystring: { page?: string; tab?: string } }>(
    "/reels",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const tab = req.query.tab === "following" ? "following" : "for_you";
      const take = 10;
      const skip = (page - 1) * take;

      // Pull a candidate window plus the viewer's interest categories and who
      // they follow, then rank with the same multi-signal model as the main
      // feed (completion rate is the dominant TikTok signal).
      const [candidates, userInterests, following] = await Promise.all([
        app.prisma.post.findMany({
          where: { deletedAt: null, postType: "reel", status: "published" },
          orderBy: { createdAt: "desc" },
          take: Math.min(skip + take * 5, 200),
          include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
        }),
        app.prisma.$queryRaw<{ category: string; score: number }[]>`
          SELECT "category", "score" FROM "UserInterest"
          WHERE "userId" = ${req.user.id}
          ORDER BY "score" DESC LIMIT 8
        `,
        app.prisma.follow.findMany({
          where: { followerId: req.user.id },
          select: { followingId: true },
        }),
      ]);

      const interestTags = new Set(userInterests.map(i => i.category.toLowerCase()));
      const followedIds = new Set(following.map(f => f.followingId));
      const now = Date.now();
      const FORTY_EIGHT_H = 48 * 3600 * 1000;

      // Following tab: only reels from accounts the viewer follows (no discovery
      // seed slots — this tab is intentionally just people you follow).
      const pool = tab === "following"
        ? candidates.filter(p => followedIds.has(p.authorId))
        : candidates;

      // Seed slots (20%): fresh, low-view reels so new creators get discovery.
      const seedPool = tab === "following" ? [] : pool.filter(p => {
        const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
        return (now - p.createdAt.getTime()) < FORTY_EIGHT_H && p.viewCount < 50 && cv < 10;
      });
      const mainPool = pool.filter(p => !seedPool.includes(p));

      const scoreReel = (p: typeof candidates[0]) => {
        const ageDays = (now - p.createdAt.getTime()) / 86400000;
        const recencyBoost = Math.max(0, 1 - ageDays / 14);
        const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
        const shareCount = (p as unknown as { shareCount: number }).shareCount ?? 0;
        // Completion rate: completed views relative to total views (0..1).
        const completionRate = p.viewCount > 0 ? Math.min(1, cv / p.viewCount) : 0;
        const tags = (p.body.match(/#(\w+)/g) ?? []).map(t => t.slice(1).toLowerCase());
        const interestBonus = tags.some(t => interestTags.has(t)) ? 30 : 0;
        const followBonus = followedIds.has(p.authorId) ? 25 : 0;
        return (
          completionRate * 120 +   // TikTok's #1 signal: did they watch it through
          cv * 15 +
          p.likeCount * 3 +
          p.commentCount * 5 +
          shareCount * 6 +         // shares weigh heavily on reels
          p.viewCount * 0.1 +
          recencyBoost * 50 +
          interestBonus +
          followBonus
        );
      };

      const scoredMain = mainPool
        .map(p => ({ ...p, _score: scoreReel(p) }))
        .sort((a, b) => b._score - a._score);
      const shuffledSeed = seedPool
        .map(p => ({ ...p, _score: scoreReel(p) }))
        .sort(() => Math.random() - 0.5);

      // Interleave 1 seed per 5 slots, filling the rest from the ranked main pool.
      const ranked: typeof scoredMain = [];
      let mainIdx = 0;
      let seedIdx = 0;
      for (let i = 0; i < skip + take; i++) {
        if (i % 5 === 4 && seedIdx < shuffledSeed.length) {
          ranked.push(shuffledSeed[seedIdx++] as typeof scoredMain[0]);
        } else if (mainIdx < scoredMain.length) {
          ranked.push(scoredMain[mainIdx++]);
        } else if (seedIdx < shuffledSeed.length) {
          ranked.push(shuffledSeed[seedIdx++] as typeof scoredMain[0]);
        }
      }
      const posts = ranked.slice(skip, skip + take);

      const myLikes = await app.prisma.like.findMany({
        where: { userId: req.user.id, targetId: { in: posts.map(p => p.id) }, targetType: "post" },
      });
      const likedSet = new Set(myLikes.map(l => l.targetId));

      return { posts: posts.map(p => mapPost(p, likedSet)), page, hasMore: posts.length === take };
    }
  );

  // GET /posts/tube  (KliqTube feed — ranked, searchable, category-filtered)
  app.get<{ Querystring: { page?: string; tab?: string; q?: string; category?: string } }>(
    "/tube",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page   = parseInt(req.query.page || "1");
      const tab    = (req.query.tab || "all").toLowerCase();
      const q      = req.query.q?.trim().toLowerCase() ?? "";
      const cat    = req.query.category?.trim().toLowerCase() ?? "";
      const take   = 18;
      const skip   = (page - 1) * take;

      // Build base where clause
      const baseWhere: Record<string, unknown> = { deletedAt: null, postType: "tube" };
      const andClauses: Record<string, unknown>[] = [];

      if (q) andClauses.push({ OR: [{ title: { contains: q } }, { body: { contains: q } }] });
      if (cat && cat !== "all") andClauses.push({ OR: [{ body: { contains: cat } }, { title: { contains: cat } }] });
      if (andClauses.length > 0) baseWhere.AND = andClauses;

      // Subscriptions tab: only show posts from followed users
      if (tab === "subscriptions") {
        const following = await app.prisma.follow.findMany({
          where: { followerId: req.user.id }, select: { followingId: true },
        });
        baseWhere.authorId = { in: following.map(f => f.followingId) };
      }

      if (tab === "trending") {
        // Fetch larger pool, score, then paginate
        const candidates = await app.prisma.post.findMany({
          where: baseWhere,
          orderBy: { createdAt: "desc" },
          take: Math.min(skip + take * 5, 200),
          include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
        });
        const now = Date.now();
        const scored = candidates.map(p => {
          const ageDays = (now - p.createdAt.getTime()) / 86400000;
          const recency = Math.max(0, 1 - ageDays / 14);
          const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
          return { ...p, _score: p.likeCount * 3 + p.viewCount * 0.5 + cv * 10 + recency * 30 };
        }).sort((a, b) => b._score - a._score);
        return scored.slice(skip, skip + take).map(p => mapPost(p, new Set()));
      }

      const posts = await app.prisma.post.findMany({
        where: baseWhere,
        orderBy: { createdAt: "desc" },
        take, skip,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });
      return posts.map(p => mapPost(p, new Set()));
    }
  );

  // GET /posts/tube/related/:id — ranked related videos by hashtag + author affinity
  app.get<{ Params: { id: string } }>(
    "/tube/related/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({
        where: { id: req.params.id, deletedAt: null },
      });
      if (!post) return reply.status(404).send({ error: "Not found" });

      const tags = (post.body.match(/#\w+/g) ?? []).map(t => t.toLowerCase());
      const tagClauses = tags.map(tag => ({ body: { contains: tag } }));

      const candidates = await app.prisma.post.findMany({
        where: {
          deletedAt: null, postType: "tube", id: { not: req.params.id },
          OR: [
            { authorId: post.authorId },
            ...(tagClauses.length > 0 ? tagClauses : [{ id: { not: "" } }]),
          ],
        },
        take: 50,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });

      const now = Date.now();
      const scored = candidates.map(p => {
        const ageDays = (now - p.createdAt.getTime()) / 86400000;
        const recency  = Math.max(0, 1 - ageDays / 14);
        const cv = (p as unknown as { completedViews: number }).completedViews ?? 0;
        const tagBoost = tags.some(t => p.body.toLowerCase().includes(t)) ? 20 : 0;
        return { ...p, _score: p.likeCount * 3 + p.viewCount * 0.5 + cv * 10 + recency * 20 + tagBoost };
      }).sort((a, b) => b._score - a._score).slice(0, 12);

      return scored.map(p => mapPost(p, new Set()));
    }
  );

  // GET /posts/stream  (KliqStream feed — approved content only)
  app.get<{ Querystring: { page?: string } }>(
    "/stream",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const posts = await app.prisma.post.findMany({
        where: { deletedAt: null, postType: "stream" },
        orderBy: { createdAt: "desc" },
        take: 18,
        skip: (page - 1) * 18,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });
      return posts.map(p => mapPost(p, new Set()));
    }
  );

  // GET /posts/marketplace
  app.get<{ Querystring: { page?: string } }>(
    "/marketplace",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const posts = await app.prisma.post.findMany({
        where: { deletedAt: null, postType: "marketplace" },
        orderBy: { createdAt: "desc" },
        take: 20,
        skip: (page - 1) * 20,
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });
      return posts.map(p => ({ ...mapPost(p, new Set()), isPaylocked: p.isPaylocked, payPrice: p.payPrice ?? null }));
    }
  );

  // GET /posts/:id
  app.get<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({
        where: { id: req.params.id, deletedAt: null },
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });
      if (!post) return reply.status(404).send({ error: "Post not found" });
      const [liked, disliked, bookmarked, purchased] = await Promise.all([
        app.prisma.like.findUnique({
          where: { userId_targetId_targetType: { userId: req.user.id, targetId: post.id, targetType: "post" } },
        }),
        app.prisma.like.findUnique({
          where: { userId_targetId_targetType: { userId: req.user.id, targetId: post.id, targetType: "post_dislike" } },
        }),
        app.prisma.bookmark.findUnique({
          where: { userId_postId: { userId: req.user.id, postId: post.id } },
        }),
        post.isPaylocked ? app.prisma.like.findUnique({
          where: { userId_targetId_targetType: { userId: req.user.id, targetId: post.id, targetType: "purchase" } },
        }) : Promise.resolve(null),
      ]);
      return {
        ...mapPost(post, liked ? new Set([post.id]) : new Set()),
        disliked: !!disliked,
        bookmarked: !!bookmarked,
        isPaylocked: post.isPaylocked,
        payPrice: post.payPrice ?? null,
        purchased: !!purchased,
      };
    }
  );

  // POST /posts/:id/view — increment viewCount once per user per post
  app.post<{ Params: { id: string } }>(
    "/:id/view",
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.id;
      const postId = req.params.id;
      const already = await app.prisma.like.findUnique({
        where: { userId_targetId_targetType: { userId, targetId: postId, targetType: "post_view" } },
      });
      if (already) {
        const cur = await app.prisma.post.findUnique({ where: { id: postId }, select: { viewCount: true } });
        return { viewCount: cur?.viewCount ?? 0 };
      }
      await app.prisma.like.create({ data: { userId, targetId: postId, targetType: "post_view" } });
      const updated = await app.prisma.post.update({
        where: { id: postId },
        data:  { viewCount: { increment: 1 } },
        select: { id: true, viewCount: true, authorId: true },
      });
      wsHub.send(updated.authorId, { type: "post:view", postId: updated.id, viewCount: updated.viewCount });
      return { viewCount: updated.viewCount };
    }
  );

  // POST /posts/:id/complete — fired when viewer watches ≥80% of a video
  // Increments completedViews once per user and boosts their interest in the post's hashtags
  app.post<{ Params: { id: string } }>(
    "/:id/complete",
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.id;
      const postId = req.params.id;
      // Deduplicate: only count one completion per user per post
      const already = await app.prisma.like.findUnique({
        where: { userId_targetId_targetType: { userId, targetId: postId, targetType: "view_complete" } },
      });
      if (already) return { ok: true };

      // Record completion marker
      await app.prisma.like.create({ data: { userId, targetId: postId, targetType: "view_complete" } });
      // Increment completedViews
      await app.prisma.$executeRaw`UPDATE "Post" SET "completedViews" = COALESCE("completedViews", 0) + 1 WHERE "id" = ${postId}`;

      // Extract hashtags and boost user's interest scores
      const post = await app.prisma.post.findUnique({ where: { id: postId }, select: { body: true } });
      if (post) {
        const tags = (post.body.match(/#(\w+)/g) ?? []).map(t => t.slice(1).toLowerCase()).slice(0, 5);
        for (const tag of tags) {
          const existing = await app.prisma.userInterest.findUnique({
            where: { userId_category: { userId, category: tag } },
          });
          if (existing) {
            await app.prisma.$executeRaw`UPDATE "UserInterest" SET "score" = "score" + 3 WHERE "userId" = ${userId} AND "category" = ${tag}`;
          } else {
            await app.prisma.$executeRaw`INSERT INTO "UserInterest" ("id","userId","category","score") VALUES (${`ui_${Date.now()}_${Math.random().toString(36).slice(2)}`}, ${userId}, ${tag}, 3)`;
          }
        }
      }

      return { ok: true };
    }
  );

  // GET /posts/scheduled
  app.get(
    "/scheduled",
    { preHandler: [app.authenticate] },
    async (req) => {
      const posts = await app.prisma.post.findMany({
        where: {
          authorId:    req.user.id,
          status:      "scheduled",
          scheduledAt: { not: null },
          deletedAt:   null,
        },
        orderBy: { scheduledAt: "asc" },
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });
      return posts.map(p => mapPost(p, new Set()));
    }
  );

  // POST /posts
  app.post<{ Body: { body: string; title?: string; mediaUrl?: string; mediaUrls?: string[]; mediaType?: string; thumbUrl?: string; thumbnailUrl?: string; postType?: string; scheduledAt?: string; stitchOfId?: string; carouselMedia?: string[]; videoDuration?: number } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { body, mediaType, scheduledAt, stitchOfId } = req.body;
      const thumbUrl = req.body.thumbUrl ?? req.body.thumbnailUrl ?? undefined;

      // The app sends the uploaded images as `mediaUrls` (array). Map it onto the
      // stored shape: first image is the primary `mediaUrl`; 2+ images become a
      // carousel. Still accept legacy `mediaUrl`/`carouselMedia` for compatibility.
      const mediaUrls = Array.isArray(req.body.mediaUrls)
        ? req.body.mediaUrls.filter(u => typeof u === "string" && u.length > 0)
        : [];
      const mediaUrl = req.body.mediaUrl ?? (mediaUrls.length > 0 ? mediaUrls[0] : undefined);
      const carouselList = req.body.carouselMedia?.length
        ? req.body.carouselMedia
        : (mediaUrls.length > 1 ? mediaUrls : undefined);
      const carouselMedia = carouselList?.length ? JSON.stringify(carouselList) : undefined;
      const videoDuration = req.body.videoDuration ?? null;
      const title = req.body.title?.trim() || null;

      // Any video post is a reel (Instagram-style: no long-form/tube surface).
      let postType = req.body.postType ?? "post";
      if (mediaType === "video") {
        postType = "reel";
      }
      if (!body && !mediaUrl && !carouselMedia) {
        return reply.status(400).send({ error: "body or mediaUrl required" });
      }

      // Determine scheduling
      let postStatus = "published";
      let scheduledDate: Date | undefined;
      if (scheduledAt) {
        const parsed = new Date(scheduledAt);
        if (!isNaN(parsed.getTime()) && parsed > new Date()) {
          postStatus = "scheduled";
          scheduledDate = parsed;
        }
      }

      const post = await app.prisma.post.create({
        data: {
          authorId:    req.user.id,
          body:        body || "",
          mediaUrl,
          mediaType,
          thumbUrl,
          postType,
          status:      postStatus,
          scheduledAt: scheduledDate,
          ...(stitchOfId ? {} : {}),
        },
        include: { author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } } },
      });

      // Store new columns via raw SQL (not in generated Prisma client)
      if (stitchOfId || carouselMedia || title || videoDuration != null) {
        await app.prisma.$executeRaw`UPDATE "Post" SET "stitchOfId" = ${stitchOfId ?? null}, "carouselMedia" = ${carouselMedia ?? null}, "title" = ${title}, "videoDuration" = ${videoDuration} WHERE "id" = ${post.id}`;
      }

      // Only increment postCount for immediately published posts
      if (postStatus === "published") {
        await app.prisma.user.update({
          where: { id: req.user.id },
          data: { postCount: { increment: 1 } },
        });
      }

      // After post creation, extract hashtags
      if (req.body.body) {
        const tags = [...new Set((req.body.body.match(/#(\w+)/g) ?? []).map((t: string) => t.slice(1).toLowerCase()))];
        for (const tag of tags) {
          const ht = await app.prisma.hashtag.upsert({
            where: { name: tag },
            create: { name: tag, postCount: 1 },
            update: { postCount: { increment: 1 } },
          });
          await app.prisma.postHashtag.upsert({
            where: { postId_hashtagId: { postId: post.id, hashtagId: ht.id } },
            create: { postId: post.id, hashtagId: ht.id },
            update: {},
          });
        }
      }

      return reply.status(201).send(mapPost(post, new Set()));
    }
  );

  // DELETE /posts/:id
  app.delete<{ Params: { id: string } }>(
    "/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return { deleted: true }; // already gone — treat as success
      if (post.authorId !== req.user.id && !req.user.isAdmin) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      if (!post.deletedAt) {
        await app.prisma.post.update({
          where: { id: req.params.id },
          data: { deletedAt: new Date() },
        });
      }

      return { deleted: true };
    }
  );

  // POST /posts/:id/like
  app.post<{ Params: { id: string } }>(
    "/:id/like",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      try {
        await app.prisma.like.create({
          data: { userId: req.user.id, targetId: req.params.id, targetType: "post" },
        });
        await app.prisma.post.update({
          where: { id: req.params.id },
          data: { likeCount: { increment: 1 } },
        });

        if (post.authorId !== req.user.id) {
          const [me, postAuthor] = await Promise.all([
            app.prisma.user.findUnique({ where: { id: req.user.id }, select: { displayName: true, username: true, avatarUrl: true } }),
            app.prisma.user.findUnique({ where: { id: post.authorId }, select: { fcmToken: true } }),
          ]);
          const notif = await app.prisma.notification.create({
            data: {
              userId:        post.authorId,
              type:          "like",
              actorName:     me?.displayName ?? "Someone",
              actorUsername: me?.username ?? null,
              actorAvatar:   me?.avatarUrl,
              message:       "liked your post",
              targetId:      post.id,
              targetType:    "post",
            },
          });
          wsHub.send(post.authorId, { type: "notification:new", notification: {
            id: notif.id, type: notif.type, actorName: notif.actorName,
            actorUsername: notif.actorUsername,
            actorAvatar: notif.actorAvatar,
            message: notif.message, targetId: notif.targetId, targetType: notif.targetType,
            readAt: null, createdAt: notif.createdAt.toISOString(),
          } });
          if (postAuthor?.fcmToken) {
            sendPushNotification(postAuthor.fcmToken, `${me?.displayName ?? "Someone"} liked your post`, "").catch(() => {});
          }
        }
      } catch {
        // Already liked — unique constraint
      }

      const updated = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      const lc = updated?.likeCount ?? 0;
      const likerId = (req.user as any).id as string;
      wsHub.send(post.authorId, { type: "post:like", postId: req.params.id, likeCount: lc, likedBy: likerId, isLiked: true });
      wsHub.broadcast({ type: "post:like", postId: req.params.id, likeCount: lc, likedBy: likerId, isLiked: true }, post.authorId);
      return { liked: true, likeCount: lc };
    }
  );

  // DELETE /posts/:id/like
  app.delete<{ Params: { id: string } }>(
    "/:id/like",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      await app.prisma.like.deleteMany({
        where: { userId: req.user.id, targetId: req.params.id, targetType: "post" },
      });
      await app.prisma.post.update({
        where: { id: req.params.id },
        data: { likeCount: { decrement: 1 } },
      });

      const updated = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      const lc = Math.max(0, updated?.likeCount ?? 0);
      const unlikerId = (req.user as any).id as string;
      wsHub.broadcast({ type: "post:like", postId: req.params.id, likeCount: lc, likedBy: unlikerId, isLiked: false });
      return { liked: false, likeCount: lc };
    }
  );

  // POST /posts/:id/dislike
  app.post<{ Params: { id: string } }>(
    "/:id/dislike",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });
      try {
        await app.prisma.like.create({
          data: { userId: req.user.id, targetId: req.params.id, targetType: "post_dislike" },
        });
        // Remove any existing like when disliking
        await app.prisma.like.deleteMany({
          where: { userId: req.user.id, targetId: req.params.id, targetType: "post" },
        });
      } catch {
        // Already disliked — unique constraint
      }
      return { disliked: true };
    }
  );

  // DELETE /posts/:id/dislike
  app.delete<{ Params: { id: string } }>(
    "/:id/dislike",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });
      await app.prisma.like.deleteMany({
        where: { userId: req.user.id, targetId: req.params.id, targetType: "post_dislike" },
      });
      return { disliked: false };
    }
  );

  // GET /posts/:id/comments
  app.get<{ Params: { id: string } }>(
    "/:id/comments",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      const comments = await app.prisma.comment.findMany({
        where: { postId: req.params.id, parentId: null, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            take: 3,
            include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
          },
        },
      });

      return comments.map(c => mapComment(c));
    }
  );

  // POST /posts/:id/repost — TikTok-style toggle repost
  app.post<{ Params: { id: string } }>(
    "/:id/repost",
    { preHandler: [app.authenticate] },
    async (req) => {
      const postId = req.params.id;
      const userId = req.user.id;

      const existing = await app.prisma.like.findUnique({
        where: { userId_targetId_targetType: { userId, targetId: postId, targetType: "repost" } },
      });

      if (existing) {
        await app.prisma.like.delete({ where: { id: existing.id } });
        await app.prisma.$executeRaw`UPDATE "Post" SET "repostCount" = CASE WHEN "repostCount" > 0 THEN "repostCount" - 1 ELSE 0 END WHERE "id" = ${postId}`;
        return { reposted: false };
      } else {
        await app.prisma.like.create({ data: { userId, targetId: postId, targetType: "repost" } });
        await app.prisma.$executeRaw`UPDATE "Post" SET "repostCount" = "repostCount" + 1 WHERE "id" = ${postId}`;
        return { reposted: true };
      }
    }
  );

  // POST /posts/:id/pin — toggle pin on own post
  app.post<{ Params: { id: string } }>("/:id/pin", { preHandler: [app.authenticate] }, async (req, reply) => {
    const post = await app.prisma.post.findFirst({ where: { id: req.params.id, authorId: req.user.id } });
    if (!post) return reply.status(403).send({ error: "Forbidden" });
    const isPinned = !!(post as unknown as { pinnedAt: Date | null }).pinnedAt;
    if (isPinned) {
      await app.prisma.$executeRaw`UPDATE "Post" SET "pinnedAt" = NULL WHERE "id" = ${req.params.id}`;
      return { pinned: false };
    } else {
      await app.prisma.$executeRaw`UPDATE "Post" SET "pinnedAt" = CURRENT_TIMESTAMP WHERE "id" = ${req.params.id}`;
      return { pinned: true };
    }
  });

  // POST /posts/:id/comments/:commentId/like — toggle comment like
  app.post<{ Params: { id: string; commentId: string } }>("/:id/comments/:commentId/like", { preHandler: [app.authenticate] }, async (req) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const existing = await app.prisma.like.findUnique({
      where: { userId_targetId_targetType: { userId, targetId: commentId, targetType: "comment" } },
    });
    if (existing) {
      await app.prisma.like.delete({ where: { id: existing.id } });
      await app.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } });
      return { liked: false };
    } else {
      await app.prisma.like.create({ data: { userId, targetId: commentId, targetType: "comment" } });
      await app.prisma.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } });
      return { liked: true };
    }
  });

  // POST /posts/:id/report
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    "/:id/report",
    { preHandler: [app.authenticate] },
    async (req) => {
      return app.prisma.report.create({
        data: { postId: req.params.id, reporterId: req.user.id, reason: req.body.reason },
      });
    }
  );

  // POST /posts/:id/purchase — buy a marketplace item with tokens
  app.post<{ Params: { id: string } }>(
    "/:id/purchase",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findUnique({ where: { id: req.params.id, deletedAt: null } });
      if (!post || post.postType !== "marketplace") return reply.status(400).send({ error: "Not a marketplace item" });
      if (!post.isPaylocked || !post.payPrice) return { ok: true };
      if (post.authorId === req.user.id) return reply.status(400).send({ error: "Cannot purchase your own item" });

      // Check if already purchased
      const existing = await app.prisma.like.findUnique({
        where: { userId_targetId_targetType: { userId: req.user.id, targetId: post.id, targetType: "purchase" } },
      });
      if (existing) return { ok: true, alreadyPurchased: true };

      const wallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet || wallet.tokens < post.payPrice) return reply.status(400).send({ error: "Insufficient tokens" });

      await app.prisma.$transaction([
        app.prisma.wallet.update({ where: { userId: req.user.id }, data: { tokens: { decrement: post.payPrice } } }),
        app.prisma.wallet.upsert({
          where: { userId: post.authorId },
          create: { userId: post.authorId, tokens: post.payPrice, balance: 0, diamonds: 0 },
          update: { tokens: { increment: post.payPrice } },
        }),
      ]);
      await app.prisma.like.upsert({
        where: { userId_targetId_targetType: { userId: req.user.id, targetId: post.id, targetType: "purchase" } },
        create: { userId: req.user.id, targetId: post.id, targetType: "purchase" },
        update: {},
      });

      const buyer = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true, displayName: true } });
      wsHub.send(post.authorId, {
        type: "marketplace:sale",
        postId: post.id,
        tokens: post.payPrice,
        buyer: { id: req.user.id, username: buyer?.username, displayName: buyer?.displayName },
      });

      return { ok: true };
    }
  );

  // DELETE /posts/scheduled/:id
  app.delete<{ Params: { id: string } }>(
    "/scheduled/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findFirst({ where: { id: req.params.id, authorId: req.user.id, status: "scheduled" } });
      if (!post) return reply.status(404).send({ error: "Not found" });
      await app.prisma.post.delete({ where: { id: req.params.id } });
      return { ok: true };
    }
  );

  // PATCH /posts/scheduled/:id
  app.patch<{ Params: { id: string }; Body: { scheduledAt: string } }>(
    "/scheduled/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findFirst({ where: { id: req.params.id, authorId: req.user.id, status: "scheduled" } });
      if (!post) return reply.status(404).send({ error: "Not found" });
      return app.prisma.post.update({ where: { id: req.params.id }, data: { scheduledAt: new Date(req.body.scheduledAt) } });
    }
  );

  // POST /posts/:id/unlock — pay tokens to unlock a paywalled post
  app.post<{ Params: { id: string } }>("/:id/unlock", { preHandler: [app.authenticate] }, async (req, reply) => {
    const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
    if (!post) return reply.status(404).send({ error: "Not found" });
    if (!post.isPaylocked || !post.payPrice) return { unlocked: true };

    const myWallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!myWallet || myWallet.tokens < post.payPrice) return reply.status(400).send({ error: "Insufficient tokens" });

    await app.prisma.$transaction([
      app.prisma.wallet.update({ where: { userId: req.user.id }, data: { tokens: { decrement: post.payPrice } } }),
      app.prisma.wallet.upsert({ where: { userId: post.authorId }, create: { userId: post.authorId, tokens: post.payPrice, balance: 0, diamonds: 0 }, update: { tokens: { increment: post.payPrice } } }),
    ]);
    return { unlocked: true };
  });

  // PATCH /posts/:id — edit post caption
  app.patch<{ Params: { id: string }; Body: { body: string } }>("/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const post = await app.prisma.post.findFirst({ where: { id: req.params.id, authorId: req.user.id } });
    if (!post) return reply.status(404).send({ error: "Not found" });
    return app.prisma.post.update({ where: { id: req.params.id }, data: { body: req.body.body } });
  });

  // POST /posts/:id/comments
  app.post<{ Params: { id: string }; Body: { body: string; parentId?: string } }>(
    "/:id/comments",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { body, parentId } = req.body;
      if (!body?.trim()) return reply.status(400).send({ error: "Comment body required" });

      const post = await app.prisma.post.findUnique({ where: { id: req.params.id } });
      if (!post) return reply.status(404).send({ error: "Post not found" });

      const comment = await app.prisma.comment.create({
        data: { authorId: req.user.id, postId: req.params.id, body, parentId },
        include: {
          author: { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } },
          replies: {
            include: { author: { select: { username: true, displayName: true, avatarUrl: true } } },
          },
        },
      });

      await app.prisma.post.update({
        where: { id: req.params.id },
        data: { commentCount: { increment: 1 } },
      });

      if (parentId) {
        await app.prisma.comment.update({ where: { id: parentId }, data: { replyCount: { increment: 1 } } });
      }

      if (post.authorId !== req.user.id) {
        const [me, postAuthor] = await Promise.all([
          app.prisma.user.findUnique({ where: { id: req.user.id }, select: { displayName: true, username: true, avatarUrl: true } }),
          app.prisma.user.findUnique({ where: { id: post.authorId }, select: { fcmToken: true } }),
        ]);
        const notif = await app.prisma.notification.create({
          data: {
            userId:        post.authorId,
            type:          "comment",
            actorName:     me?.displayName ?? "Someone",
            actorUsername: me?.username ?? null,
            actorAvatar:   me?.avatarUrl,
            message:       `commented: ${body.slice(0, 50)}`,
            targetId:      post.id,
            targetType:    "post",
          },
        });
        wsHub.send(post.authorId, { type: "notification:new", notification: {
          id: notif.id, type: notif.type, actorName: notif.actorName,
          actorUsername: notif.actorUsername,
          actorAvatar: notif.actorAvatar,
          message: notif.message, targetId: notif.targetId, targetType: notif.targetType,
          readAt: null, createdAt: notif.createdAt.toISOString(),
        } });
        if (postAuthor?.fcmToken) {
          sendPushNotification(postAuthor.fcmToken, `${me?.displayName ?? "Someone"} commented`, body.slice(0, 80)).catch(() => {});
        }
      }

      const updatedPost = await app.prisma.post.findUnique({ where: { id: req.params.id }, select: { commentCount: true } });
      const commentCount = updatedPost?.commentCount ?? post.commentCount + 1;
      const mapped = mapComment(comment);
      wsHub.send(post.authorId, { type: "post:comment", postId: req.params.id, comment: mapped, commentCount });
      wsHub.broadcast({ type: "post:comment", postId: req.params.id, comment: mapped, commentCount }, post.authorId);
      return reply.status(201).send(mapped);
    }
  );
}

type AuthorSel = { username: string; displayName: string; avatarUrl: string | null; isVerified?: boolean };
type PostRaw = {
  id: string; body: string; mediaUrl: string | null; mediaType: string | null; thumbUrl?: string | null; postType: string;
  status?: string; scheduledAt?: Date | null; pinnedAt?: Date | null; stitchOfId?: string | null; carouselMedia?: string | null;
  title?: string | null; videoDuration?: number | null;
  likeCount: number; commentCount: number; shareCount: number; viewCount: number; completedViews?: number; createdAt: Date;
  author: AuthorSel;
};

function mapPost(p: PostRaw, likedSet: Set<string>, repostedSet?: Set<string>) {
  let carouselUrls: string[] | undefined;
  if (p.carouselMedia) {
    try { carouselUrls = JSON.parse(p.carouselMedia); } catch { /* ignore */ }
  }
  return {
    id:           p.id,
    body:         p.body,
    mediaUrl:     p.mediaUrl,
    mediaType:    p.mediaType,
    thumbUrl:     p.thumbUrl ?? null,
    postType:     p.postType,
    status:       p.status ?? "published",
    scheduledAt:  p.scheduledAt ?? null,
    pinnedAt:      p.pinnedAt ?? null,
    stitchOfId:    p.stitchOfId ?? null,
    carouselMedia: carouselUrls ?? null,
    title:         p.title ?? null,
    videoDuration: p.videoDuration ?? null,
    likeCount:    p.likeCount,
    commentCount: p.commentCount,
    shareCount:   p.shareCount,
    viewCount:       p.viewCount,
    completedViews:  p.completedViews ?? 0,
    createdAt:       p.createdAt,
    liked:        likedSet.has(p.id),
    reposted:     repostedSet ? repostedSet.has(p.id) : false,
    author: {
      username:    p.author.username,
      displayName: p.author.displayName,
      avatarUrl:   p.author.avatarUrl,
      isVerified:  (p.author as { isVerified?: boolean }).isVerified ?? false,
    },
  };
}

type CommentRaw = {
  id: string; body: string; likeCount: number; createdAt: Date;
  author: AuthorSel;
  replies?: { id: string; body: string; likeCount: number; createdAt: Date; author: { username: string; displayName: string; avatarUrl: string | null } }[];
};

function mapComment(c: CommentRaw) {
  return {
    id:        c.id,
    body:      c.body,
    likeCount: c.likeCount,
    createdAt: c.createdAt,
    author: {
      username:    c.author.username,
      displayName: c.author.displayName,
      avatarUrl:   c.author.avatarUrl,
      isVerified:  (c.author as { isVerified?: boolean }).isVerified ?? false,
    },
    replies: (c.replies ?? []).map(r => ({
      id:        r.id,
      body:      r.body,
      likeCount: r.likeCount,
      createdAt: r.createdAt,
      author: {
        username:    r.author.username,
        displayName: r.author.displayName,
        avatarUrl:   r.author.avatarUrl,
      },
    })),
  };
}
