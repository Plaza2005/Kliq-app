import { FastifyInstance } from "fastify";

export async function pollRoutes(app: FastifyInstance) {
  // POST /polls — create poll on a post
  app.post<{ Body: { postId: string; question: string; options: string[]; endsAt?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const post = await app.prisma.post.findFirst({ where: { id: req.body.postId, authorId: req.user.id } });
      if (!post) return reply.status(403).send({ error: "Not your post" });
      return app.prisma.poll.create({
        data: {
          postId: req.body.postId,
          question: req.body.question,
          endsAt: req.body.endsAt ? new Date(req.body.endsAt) : null,
          options: { create: req.body.options.map((text) => ({ text })) },
        },
        include: { options: true },
      });
    }
  );

  // GET /polls/:postId
  app.get<{ Params: { postId: string } }>("/:postId", { preHandler: [app.authenticate] }, async (req) => {
    const poll = await app.prisma.poll.findUnique({
      where: { postId: req.params.postId },
      include: { options: { include: { _count: { select: { votes: true } } } } },
    });
    if (!poll) return null;
    const myVote = await app.prisma.pollVote.findFirst({ where: { pollId: poll.id, userId: req.user.id } });
    return { ...poll, myVoteOptionId: myVote?.optionId ?? null };
  });

  // POST /polls/:id/vote
  app.post<{ Params: { id: string }; Body: { optionId: string } }>(
    "/:id/vote",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const poll = await app.prisma.poll.findUnique({ where: { id: req.params.id } });
      if (!poll) return reply.status(404).send({ error: "Poll not found" });
      const existing = await app.prisma.pollVote.findFirst({ where: { pollId: poll.id, userId: req.user.id } });
      if (existing) return reply.status(400).send({ error: "Already voted" });
      return app.prisma.pollVote.create({
        data: { pollId: poll.id, optionId: req.body.optionId, userId: req.user.id },
      });
    }
  );
}
