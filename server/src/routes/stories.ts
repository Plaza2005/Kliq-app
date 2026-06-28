import { FastifyInstance } from "fastify";

export async function storyRoutes(app: FastifyInstance) {
  // GET /stories/feed
  app.get(
    "/feed",
    { preHandler: [app.authenticate] },
    async (req) => {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get users the current user follows
      const following = await app.prisma.follow.findMany({
        where: { followerId: req.user.id },
        select: { followingId: true },
      });
      const followedIds = following.map(f => f.followingId);

      if (followedIds.length === 0) return [];

      // Fetch non-expired stories from followed users
      const stories = await app.prisma.story.findMany({
        where: {
          userId:    { in: followedIds },
          expiresAt: { gt: new Date() },
          createdAt: { gt: cutoff },
        },
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          views: { where: { viewerId: req.user.id }, select: { id: true } },
        },
      });

      // Group by userId, max 5 per user
      const grouped = new Map<string, {
        userId: string;
        author: { username: string; displayName: string; avatarUrl: string | null };
        stories: object[];
        hasViewed: boolean;
      }>();

      for (const story of stories) {
        const uid = story.userId;
        if (!grouped.has(uid)) {
          grouped.set(uid, {
            userId:    uid,
            author: {
              username:    story.user.username,
              displayName: story.user.displayName,
              avatarUrl:   story.user.avatarUrl,
            },
            stories:   [],
            hasViewed: false,
          });
        }
        const group = grouped.get(uid)!;
        if (group.stories.length < 5) {
          group.stories.push({
            id:        story.id,
            mediaUrl:  story.mediaUrl,
            mediaType: story.mediaType,
            body:      story.body,
            createdAt: story.createdAt,
            expiresAt: story.expiresAt,
            viewCount: story.viewCount,
          });
        }
        if (story.views.length > 0) {
          group.hasViewed = true;
        }
      }

      return Array.from(grouped.values());
    }
  );

  // POST /stories
  app.post<{ Body: { mediaUrl?: string; mediaType?: string; body?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { mediaUrl, mediaType, body } = req.body;
      if (!mediaUrl && !body) {
        return reply.status(400).send({ error: "mediaUrl or body required" });
      }

      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const story = await app.prisma.story.create({
        data: {
          userId: req.user.id,
          mediaUrl,
          mediaType,
          body,
          expiresAt,
        },
        include: {
          user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      return reply.status(201).send(story);
    }
  );

  // POST /stories/:id/view
  app.post<{ Params: { id: string } }>(
    "/:id/view",
    async (req, reply) => {
      const story = await app.prisma.story.findUnique({ where: { id: req.params.id } });
      if (!story) return reply.status(404).send({ error: "Story not found" });

      // Try to get auth (optional)
      let viewerId: string | null = null;
      try {
        await req.jwtVerify();
        viewerId = req.user?.id ?? null;
      } catch {
        // unauthenticated — still increment
      }

      const updated = await app.prisma.story.update({
        where: { id: req.params.id },
        data:  { viewCount: { increment: 1 } },
        select: { viewCount: true },
      });

      // Record viewer if authenticated
      if (viewerId) {
        await app.prisma.storyView.create({
          data: { storyId: req.params.id, viewerId },
        }).catch(() => {/* ignore duplicate */});
      } else {
        await app.prisma.storyView.create({
          data: { storyId: req.params.id },
        }).catch(() => {/* ignore */});
      }

      return { viewCount: updated.viewCount };
    }
  );
}
