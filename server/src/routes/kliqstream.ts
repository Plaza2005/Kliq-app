import { FastifyInstance } from "fastify";

const TIER_RANK: Record<string, number> = { free: 0, plus: 1, pro: 2 };

function tierAllows(userTier: string, minTier: string): boolean {
  return (TIER_RANK[userTier] ?? 0) >= (TIER_RANK[minTier] ?? 0);
}

export async function kliqstreamRoutes(app: FastifyInstance) {
  // GET /kliqstream/browse
  app.get(
    "/browse",
    { preHandler: [app.authenticate] },
    async (req) => {
      const user = await app.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tier: true },
      });
      const userTier = user?.tier ?? "free";

      const allTitles = await app.prisma.kliqStreamTitle.findMany({
        where: { status: "approved" },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      const mapTitle = (t: typeof allTitles[0]) => {
        const allowed = tierAllows(userTier, t.minTier);
        return {
          id:         t.id,
          type:       t.type,
          title:      t.title,
          synopsis:   allowed ? t.synopsis : null,
          genre:      t.genre,
          ageRating:  t.ageRating,
          posterUrl:  t.posterUrl,
          trailerUrl: allowed ? t.trailerUrl : null,
          mediaUrl:   allowed ? t.mediaUrl : null,
          duration:   t.duration,
          isFeatured: t.isFeatured,
          minTier:    t.minTier,
          locked:     !allowed,
          createdAt:  t.createdAt,
          author: {
            id:          t.author.id,
            username:    t.author.username,
            displayName: t.author.displayName,
            avatarUrl:   t.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${t.author.username}`,
          },
        };
      };

      const featured = allTitles.filter(t => t.isFeatured).map(mapTitle);

      // Group by genre
      const genreMap = new Map<string, (typeof allTitles[0])[]>();
      for (const t of allTitles) {
        if (!genreMap.has(t.genre)) genreMap.set(t.genre, []);
        genreMap.get(t.genre)!.push(t);
      }

      const genres = Array.from(genreMap.entries()).map(([name, titles]) => ({
        name,
        titles: titles.map(mapTitle),
      }));

      return { featured, genres };
    }
  );

  // GET /kliqstream/genres
  app.get(
    "/genres",
    { preHandler: [app.authenticate] },
    async () => {
      const rows = await app.prisma.kliqStreamTitle.findMany({
        where: { status: "approved" },
        select: { genre: true },
        distinct: ["genre"],
        orderBy: { genre: "asc" },
      });
      return { genres: rows.map(r => r.genre) };
    }
  );

  // GET /kliqstream/title/:id
  app.get<{ Params: { id: string } }>(
    "/title/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const title = await app.prisma.kliqStreamTitle.findUnique({
        where: { id: req.params.id },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
          seasons: {
            orderBy: { number: "asc" },
            include: {
              episodes: { orderBy: { number: "asc" } },
            },
          },
        },
      });
      if (!title) return reply.status(404).send({ error: "Title not found" });

      return {
        id:         title.id,
        type:       title.type,
        title:      title.title,
        synopsis:   title.synopsis,
        genre:      title.genre,
        ageRating:  title.ageRating,
        posterUrl:  title.posterUrl,
        trailerUrl: title.trailerUrl,
        mediaUrl:   title.mediaUrl,
        duration:   title.duration,
        isFeatured: title.isFeatured,
        minTier:    title.minTier,
        status:     title.status,
        createdAt:  title.createdAt,
        author: {
          id:          title.author.id,
          username:    title.author.username,
          displayName: title.author.displayName,
          avatarUrl:   title.author.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${title.author.username}`,
        },
        seasons: title.seasons.map(s => ({
          id:       s.id,
          number:   s.number,
          episodes: s.episodes.map(e => ({
            id:       e.id,
            number:   e.number,
            title:    e.title,
            synopsis: e.synopsis,
            mediaUrl: e.mediaUrl,
            duration: e.duration,
            thumbUrl: e.thumbUrl,
          })),
        })),
      };
    }
  );

  // GET /kliqstream/watch/:episodeId
  app.get<{ Params: { episodeId: string } }>(
    "/watch/:episodeId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const episode = await app.prisma.kliqEpisode.findUnique({
        where: { id: req.params.episodeId },
        include: {
          season: {
            include: { title: { select: { minTier: true, status: true } } },
          },
        },
      });
      if (!episode) return reply.status(404).send({ error: "Episode not found" });
      if (episode.season.title.status !== "approved") {
        return reply.status(403).send({ error: "Content not available" });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: req.user.id },
        select: { tier: true },
      });
      const userTier = user?.tier ?? "free";
      if (!tierAllows(userTier, episode.season.title.minTier)) {
        return reply.status(403).send({ error: "Upgrade your tier to watch this content", locked: true });
      }

      return { mediaUrl: episode.mediaUrl, duration: episode.duration };
    }
  );

  // POST /kliqstream/titles
  app.post<{
    Body: {
      type: string; title: string; synopsis?: string; genre?: string;
      ageRating?: string; posterUrl?: string; trailerUrl?: string;
      mediaUrl?: string; duration?: number; minTier?: string;
    }
  }>(
    "/titles",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const {
        type, title, synopsis, genre = "Drama", ageRating = "PG",
        posterUrl, trailerUrl, mediaUrl, duration, minTier = "free",
      } = req.body;

      if (!type || !title) return reply.status(400).send({ error: "type and title are required" });
      if (!["movie", "series"].includes(type)) {
        return reply.status(400).send({ error: "type must be 'movie' or 'series'" });
      }

      const created = await app.prisma.kliqStreamTitle.create({
        data: {
          type, title, synopsis, genre, ageRating,
          posterUrl, trailerUrl, mediaUrl, duration, minTier,
          authorId: req.user.id,
        },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      });

      return reply.status(201).send(created);
    }
  );

  // POST /kliqstream/progress — save watch progress
  app.post<{ Body: { contentId: string; contentType: string; progressS: number; durationS?: number } }>(
    "/progress", { preHandler: [app.authenticate] }, async (req) => {
      return app.prisma.watchProgress.upsert({
        where: { userId_contentId: { userId: req.user.id, contentId: req.body.contentId } },
        create: { userId: req.user.id, contentId: req.body.contentId, contentType: req.body.contentType, progressS: req.body.progressS, durationS: req.body.durationS },
        update: { progressS: req.body.progressS, durationS: req.body.durationS },
      });
    }
  );

  // GET /kliqstream/progress/:contentId
  app.get<{ Params: { contentId: string } }>("/progress/:contentId", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.watchProgress.findUnique({ where: { userId_contentId: { userId: req.user.id, contentId: req.params.contentId } } }) ?? { progressS: 0 };
  });

  // GET /kliqstream/continue-watching
  app.get("/continue-watching", { preHandler: [app.authenticate] }, async (req) => {
    const progress = await app.prisma.watchProgress.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });
    return progress;
  });

  // POST /kliqstream/watchlist/:titleId — add to My List
  app.post<{ Params: { titleId: string } }>("/watchlist/:titleId", { preHandler: [app.authenticate] }, async (req) => {
    const listId = `wl_${req.user.id}`;
    await app.prisma.kliqPlaylist.upsert({
      where: { id: listId },
      create: { id: listId, userId: req.user.id, name: "My List" },
      update: {},
    }).catch(() => {});
    await app.prisma.kliqPlaylistItem.upsert({
      where: { playlistId_contentId: { playlistId: listId, contentId: req.params.titleId } },
      create: { playlistId: listId, contentId: req.params.titleId, contentType: "stream_title", position: 0 },
      update: {},
    });
    return { ok: true };
  });

  // DELETE /kliqstream/watchlist/:titleId
  app.delete<{ Params: { titleId: string } }>("/watchlist/:titleId", { preHandler: [app.authenticate] }, async (req) => {
    await app.prisma.kliqPlaylistItem.deleteMany({ where: { playlistId: `wl_${req.user.id}`, contentId: req.params.titleId } });
    return { ok: true };
  });

  // GET /kliqstream/watchlist
  app.get("/watchlist", { preHandler: [app.authenticate] }, async (req) => {
    const items = await app.prisma.kliqPlaylistItem.findMany({ where: { playlistId: `wl_${req.user.id}` } });
    if (items.length === 0) return [];
    return app.prisma.kliqStreamTitle.findMany({ where: { id: { in: items.map(i => i.contentId) } } });
  });

  // POST /kliqstream/titles/:id/seasons
  app.post<{ Params: { id: string }; Body: { number: number } }>(
    "/titles/:id/seasons",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const titleRecord = await app.prisma.kliqStreamTitle.findUnique({
        where: { id: req.params.id },
      });
      if (!titleRecord) return reply.status(404).send({ error: "Title not found" });
      if (titleRecord.authorId !== req.user.id && !req.user.isAdmin) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const { number } = req.body;
      if (typeof number !== "number") return reply.status(400).send({ error: "number is required" });

      const season = await app.prisma.kliqSeason.create({
        data: { titleId: req.params.id, number },
      });
      return reply.status(201).send(season);
    }
  );

  // POST /kliqstream/seasons/:id/episodes
  app.post<{
    Params: { id: string };
    Body: { number: number; title: string; synopsis?: string; mediaUrl: string; duration?: number; thumbUrl?: string };
  }>(
    "/seasons/:id/episodes",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const season = await app.prisma.kliqSeason.findUnique({
        where: { id: req.params.id },
        include: { title: { select: { authorId: true } } },
      });
      if (!season) return reply.status(404).send({ error: "Season not found" });
      if (season.title.authorId !== req.user.id && !req.user.isAdmin) {
        return reply.status(403).send({ error: "Forbidden" });
      }

      const { number, title, synopsis, mediaUrl, duration, thumbUrl } = req.body;
      if (!number || !title || !mediaUrl) {
        return reply.status(400).send({ error: "number, title, and mediaUrl are required" });
      }

      const episode = await app.prisma.kliqEpisode.create({
        data: { seasonId: req.params.id, number, title, synopsis, mediaUrl, duration, thumbUrl },
      });
      return reply.status(201).send(episode);
    }
  );
}
