import { FastifyInstance } from "fastify";

const TOKENS_PER_DOLLAR = 110;

async function getOrCreateWallet(app: FastifyInstance, userId: string) {
  let wallet = await app.prisma.wallet.findUnique({
    where: { userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
  });
  if (!wallet) {
    wallet = await app.prisma.wallet.create({
      data: { userId },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
    });
  }
  return wallet;
}

export async function walletRoutes(app: FastifyInstance) {
  // GET /wallet/me
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (req) => {
      const wallet = await getOrCreateWallet(app, req.user.id);
      return {
        balance:      wallet.balance,
        tokens:       wallet.tokens,
        diamonds:     wallet.diamonds,
        transactions: wallet.transactions,
      };
    }
  );

  // POST /wallet/topup
  app.post<{ Body: { amount: number; method: "fiat" | "crypto" } }>(
    "/topup",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { amount, method } = req.body;
      if (!amount || amount <= 0) {
        return reply.status(400).send({ error: "amount must be positive" });
      }
      if (!["fiat", "crypto"].includes(method)) {
        return reply.status(400).send({ error: "method must be fiat or crypto" });
      }

      const tokensEarned = Math.floor(amount * TOKENS_PER_DOLLAR);

      // Ensure wallet exists
      let existing = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!existing) {
        existing = await app.prisma.wallet.create({ data: { userId: req.user.id } });
      }

      const wallet = await app.prisma.wallet.update({
        where: { userId: req.user.id },
        data: {
          balance: { increment: amount },
          tokens:  { increment: tokensEarned },
          transactions: {
            create: {
              type:   "topup",
              title:  `Top-up via ${method}`,
              amount: `+$${amount.toFixed(2)}`,
              status: "completed",
            },
          },
        },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
      });

      return {
        balance:      wallet.balance,
        tokens:       wallet.tokens,
        diamonds:     wallet.diamonds,
        transactions: wallet.transactions,
      };
    }
  );

  // POST /wallet/withdraw
  app.post<{ Body: { diamonds: number; method: "fiat" | "crypto"; destination: string } }>(
    "/withdraw",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { diamonds, method, destination } = req.body;
      if (!diamonds || diamonds <= 0) {
        return reply.status(400).send({ error: "diamonds must be positive" });
      }
      if (diamonds < 4500) {
        return reply.status(400).send({ error: "Minimum withdrawal is 4,500 diamonds" });
      }
      if (!destination?.trim()) {
        return reply.status(400).send({ error: "destination required" });
      }

      let existing = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!existing) {
        existing = await app.prisma.wallet.create({ data: { userId: req.user.id } });
      }

      if (existing.diamonds < diamonds) {
        return reply.status(400).send({ error: "Insufficient diamonds" });
      }

      const wallet = await app.prisma.wallet.update({
        where: { userId: req.user.id },
        data: {
          diamonds: { decrement: diamonds },
          transactions: {
            create: {
              type:   "withdraw",
              title:  `Withdrawal via ${method} to ${destination}`,
              amount: `-${diamonds} diamonds`,
              status: "completed",
            },
          },
        },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
      });

      return {
        balance:      wallet.balance,
        tokens:       wallet.tokens,
        diamonds:     wallet.diamonds,
        transactions: wallet.transactions,
      };
    }
  );

  // POST /wallet/tip/:username
  app.post<{ Params: { username: string }; Body: { amount: number; message?: string } }>(
    "/tip/:username", { preHandler: [app.authenticate] }, async (req, reply) => {
      const target = await app.prisma.user.findUnique({ where: { username: req.params.username } });
      if (!target) return reply.status(404).send({ error: "User not found" });
      const amount = req.body.amount;
      if (!amount || amount <= 0) return reply.status(400).send({ error: "Invalid amount" });

      const myWallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!myWallet || myWallet.tokens < amount) return reply.status(400).send({ error: "Insufficient tokens" });

      await app.prisma.$transaction([
        app.prisma.wallet.update({ where: { userId: req.user.id }, data: { tokens: { decrement: amount } } }),
        app.prisma.wallet.upsert({
          where: { userId: target.id },
          create: { userId: target.id, tokens: amount, balance: 0, diamonds: 0 },
          update: { tokens: { increment: amount } },
        }),
        app.prisma.walletTransaction.create({ data: { walletId: myWallet.id, type: "tip_sent", title: `Tip to @${target.username}${req.body.message ? ": " + req.body.message : ""}`, amount: `-${amount}` } }),
      ]);

      const me = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true, displayName: true } });
      const { wsHub } = await import("../ws");
      wsHub.send(target.id, { type: "notification:new", notification: { type: "tip", actorName: me?.displayName ?? me?.username ?? "Someone", message: `sent you ${amount} tokens as a tip${req.body.message ? ": " + req.body.message : ""}` } });

      return { ok: true };
    }
  );

  // GET /wallet/me/transactions — tip & transaction history
  app.get("/me/transactions", { preHandler: [app.authenticate] }, async (req) => {
    const wallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet) return [];
    return app.prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  });

  // POST /wallet/transfer
  app.post<{ Body: { toUsername: string; amount: number; currency: "tokens" | "diamonds" } }>(
    "/transfer",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { toUsername, amount, currency } = req.body;
      if (!amount || amount <= 0) {
        return reply.status(400).send({ error: "amount must be positive" });
      }
      if (!["tokens", "diamonds"].includes(currency)) {
        return reply.status(400).send({ error: "currency must be tokens or diamonds" });
      }

      const recipient = await app.prisma.user.findUnique({ where: { username: toUsername } });
      if (!recipient) return reply.status(404).send({ error: "Recipient not found" });
      if (recipient.id === req.user.id) {
        return reply.status(400).send({ error: "Cannot transfer to yourself" });
      }

      // Get or create sender wallet
      let senderWallet = await app.prisma.wallet.findUnique({ where: { userId: req.user.id } });
      if (!senderWallet) {
        senderWallet = await app.prisma.wallet.create({ data: { userId: req.user.id } });
      }

      // Check balance
      if (currency === "tokens" && senderWallet.tokens < amount) {
        return reply.status(400).send({ error: "Insufficient tokens" });
      }
      if (currency === "diamonds" && senderWallet.diamonds < amount) {
        return reply.status(400).send({ error: "Insufficient diamonds" });
      }

      // Get or create recipient wallet
      let recipientWallet = await app.prisma.wallet.findUnique({ where: { userId: recipient.id } });
      if (!recipientWallet) {
        recipientWallet = await app.prisma.wallet.create({ data: { userId: recipient.id } });
      }

      const field = currency as "tokens" | "diamonds";
      const me = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true } });

      // Deduct from sender
      const updatedSender = await app.prisma.wallet.update({
        where: { userId: req.user.id },
        data: {
          [field]: { decrement: amount },
          transactions: {
            create: {
              type:   "transfer_out",
              title:  `Transfer to @${toUsername}`,
              amount: `-${amount} ${currency}`,
              status: "completed",
            },
          },
        },
        include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } },
      });

      // Credit recipient
      await app.prisma.wallet.update({
        where: { userId: recipient.id },
        data: {
          [field]: { increment: amount },
          transactions: {
            create: {
              type:   "transfer_in",
              title:  `Transfer from @${me?.username ?? "unknown"}`,
              amount: `+${amount} ${currency}`,
              status: "completed",
            },
          },
        },
      });

      return {
        balance:      updatedSender.balance,
        tokens:       updatedSender.tokens,
        diamonds:     updatedSender.diamonds,
        transactions: updatedSender.transactions,
      };
    }
  );
}
