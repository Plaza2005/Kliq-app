import { FastifyInstance } from "fastify";

export async function amplifyRoutes(app: FastifyInstance) {
  // POST /amplify/campaigns
  app.post<{ Body: { postId: string; goal: string; budget: number; duration: number } }>(
    "/campaigns",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { postId, goal, budget, duration } = req.body;

      if (!postId || !goal || !budget || !duration) {
        return reply.status(400).send({ error: "postId, goal, budget, and duration are required" });
      }
      if (budget <= 0) return reply.status(400).send({ error: "budget must be positive" });
      if (duration <= 0) return reply.status(400).send({ error: "duration must be positive" });

      // Verify the post belongs to the authenticated user
      const post = await app.prisma.post.findUnique({ where: { id: postId } });
      if (!post) return reply.status(404).send({ error: "Post not found" });
      if (post.authorId !== req.user.id) {
        return reply.status(403).send({ error: "Forbidden: post does not belong to you" });
      }

      // Ensure wallet exists and has enough tokens
      let wallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!wallet) {
        wallet = await app.prisma.wallet.create({ data: { userId: req.user.id } });
      }
      if (wallet.tokens < budget) {
        return reply.status(400).send({ error: "Insufficient tokens" });
      }

      // Deduct budget from wallet
      await app.prisma.wallet.update({
        where: { userId: req.user.id },
        data: {
          tokens: { decrement: budget },
          transactions: {
            create: {
              type:   "transfer_out",
              title:  `Amplify campaign: ${goal}`,
              amount: `-${budget} tokens`,
              status: "completed",
            },
          },
        },
      });

      // Create campaign
      const campaign = await app.prisma.campaign.create({
        data: {
          userId:   req.user.id,
          postId,
          goal,
          budget,
          duration,
          status:   "active",
          reach:    0,
        },
      });

      return reply.status(201).send(campaign);
    }
  );

  // GET /amplify/campaigns
  app.get(
    "/campaigns",
    { preHandler: [app.authenticate] },
    async (req) => {
      const campaigns = await app.prisma.campaign.findMany({
        where:   { userId: req.user.id },
        orderBy: { createdAt: "desc" },
        include: {
          post: {
            select: { id: true, body: true, mediaUrl: true, mediaType: true, postType: true, likeCount: true, viewCount: true },
          },
        },
      });
      return campaigns;
    }
  );
}
