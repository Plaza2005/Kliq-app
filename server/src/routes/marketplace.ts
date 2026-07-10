import { FastifyInstance } from "fastify";
import { wsHub } from "../ws";

const SELLER_SELECT = { select: { username: true, displayName: true, avatarUrl: true, isVerified: true } };

export async function marketplaceRoutes(app: FastifyInstance) {
  // GET /marketplace/products — browse (filters: q, price range, digital/physical, seller)
  app.get<{ Querystring: { q?: string; minPrice?: string; maxPrice?: string; type?: string; seller?: string; page?: string } }>(
    "/products",
    { preHandler: [app.authenticate] },
    async (req) => {
      const page = parseInt(req.query.page || "1");
      const take = 24;

      const where: Record<string, unknown> = { status: { in: ["active", "sold_out"] } };
      if (req.query.q) where.title = { contains: req.query.q, mode: "insensitive" };
      if (req.query.type === "digital")  where.isDigital = true;
      if (req.query.type === "physical") where.isDigital = false;
      const minPrice = parseInt(req.query.minPrice || "");
      const maxPrice = parseInt(req.query.maxPrice || "");
      if (!isNaN(minPrice) || !isNaN(maxPrice)) {
        where.price = { ...(!isNaN(minPrice) ? { gte: minPrice } : {}), ...(!isNaN(maxPrice) ? { lte: maxPrice } : {}) };
      }
      if (req.query.seller) where.seller = { username: req.query.seller };

      return app.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take,
        skip: (page - 1) * take,
        include: { seller: SELLER_SELECT },
      });
    }
  );

  // GET /marketplace/my-products — seller's own listings (must be before /products/:id)
  app.get("/my-products", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.product.findMany({
      where: { sellerId: req.user.id, status: { not: "removed" } },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
  });

  // GET /marketplace/products/:id — single product
  app.get<{ Params: { id: string } }>(
    "/products/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const product = await app.prisma.product.findUnique({
        where: { id: req.params.id },
        include: { seller: SELLER_SELECT, _count: { select: { orders: true } } },
      });
      if (!product || product.status === "removed") return reply.status(404).send({ error: "Product not found" });
      return product;
    }
  );

  // POST /marketplace/products — create listing (any authenticated user may sell)
  app.post<{ Body: { title: string; description?: string; price: number; isDigital?: boolean; stock?: number | null; mediaUrl?: string; thumbUrl?: string; category?: string; condition?: string; location?: string } }>(
    "/products",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { title, description, price, isDigital, mediaUrl, thumbUrl, category, condition, location } = req.body;
      if (!title || title.trim().length < 3) return reply.status(400).send({ error: "Title must be at least 3 characters" });
      if (!Number.isInteger(price) || price <= 0) return reply.status(400).send({ error: "Price must be a positive whole number of tokens" });

      // Digital goods default to unlimited stock (null); physical goods default to 1
      let stock: number | null;
      if (req.body.stock === null || req.body.stock === undefined) {
        stock = isDigital ? null : 1;
      } else {
        if (!Number.isInteger(req.body.stock) || req.body.stock < 0) return reply.status(400).send({ error: "Stock must be a non-negative whole number" });
        stock = req.body.stock;
      }

      const product = await app.prisma.product.create({
        data: {
          sellerId:    req.user.id,
          title:       title.trim(),
          description: description?.trim() || "",
          price,
          isDigital:   !!isDigital,
          stock,
          status:      stock === 0 ? "sold_out" : "active",
          mediaUrl, thumbUrl, category, condition, location,
        },
        include: { seller: SELLER_SELECT },
      });
      return reply.status(201).send(product);
    }
  );

  // PATCH /marketplace/products/:id — edit own listing (or admin)
  app.patch<{ Params: { id: string }; Body: { title?: string; description?: string; price?: number; stock?: number | null; status?: string; mediaUrl?: string; thumbUrl?: string; category?: string; condition?: string; location?: string } }>(
    "/products/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const product = await app.prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product || product.status === "removed") return reply.status(404).send({ error: "Product not found" });
      if (product.sellerId !== req.user.id && !req.user.isAdmin) return reply.status(403).send({ error: "Forbidden" });

      const data: Record<string, unknown> = {};
      if (req.body.title !== undefined) {
        if (req.body.title.trim().length < 3) return reply.status(400).send({ error: "Title must be at least 3 characters" });
        data.title = req.body.title.trim();
      }
      if (req.body.description !== undefined) data.description = req.body.description.trim();
      if (req.body.price !== undefined) {
        if (!Number.isInteger(req.body.price) || req.body.price <= 0) return reply.status(400).send({ error: "Price must be a positive whole number of tokens" });
        data.price = req.body.price;
      }
      if (req.body.stock !== undefined) {
        if (req.body.stock !== null && (!Number.isInteger(req.body.stock) || req.body.stock < 0)) return reply.status(400).send({ error: "Stock must be a non-negative whole number" });
        data.stock = req.body.stock;
      }
      if (req.body.status !== undefined) {
        if (!["active", "sold_out"].includes(req.body.status)) return reply.status(400).send({ error: "status must be active or sold_out" });
        data.status = req.body.status;
      }
      for (const key of ["mediaUrl", "thumbUrl", "category", "condition", "location"] as const) {
        if (req.body[key] !== undefined) data[key] = req.body[key];
      }

      return app.prisma.product.update({
        where: { id: req.params.id },
        data,
        include: { seller: SELLER_SELECT },
      });
    }
  );

  // DELETE /marketplace/products/:id — remove listing (owner or admin, soft delete)
  app.delete<{ Params: { id: string } }>(
    "/products/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const product = await app.prisma.product.findUnique({ where: { id: req.params.id } });
      if (!product) return { removed: true };
      if (product.sellerId !== req.user.id && !req.user.isAdmin) return reply.status(403).send({ error: "Forbidden" });
      if (product.status !== "removed") {
        await app.prisma.product.update({ where: { id: req.params.id }, data: { status: "removed" } });
      }
      return { removed: true };
    }
  );

  // POST /marketplace/products/:id/buy — atomic purchase with wallet tokens
  app.post<{ Params: { id: string }; Body: { quantity?: number } }>(
    "/products/:id/buy",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const quantity = req.body?.quantity ?? 1;
      if (!Number.isInteger(quantity) || quantity <= 0) return reply.status(400).send({ error: "quantity must be a positive whole number" });

      const paymentRef = `KLIQ-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

      try {
        const order = await app.prisma.$transaction(async (tx) => {
          const product = await tx.product.findUnique({ where: { id: req.params.id } });
          if (!product || product.status === "removed") throw new Error("Product not found");
          if (product.status !== "active") throw new Error("Product is sold out");
          if (product.sellerId === req.user.id) throw new Error("Cannot buy your own product");
          if (product.stock !== null && product.stock < quantity) throw new Error("Not enough stock");

          const total = product.price * quantity;

          // Ensure both wallets exist
          const buyerWallet  = await tx.wallet.upsert({ where: { userId: req.user.id },      create: { userId: req.user.id },      update: {} });
          const sellerWallet = await tx.wallet.upsert({ where: { userId: product.sellerId }, create: { userId: product.sellerId }, update: {} });

          // Deduct buyer — guarded so concurrent buys can't overspend
          const debited = await tx.wallet.updateMany({
            where: { id: buyerWallet.id, tokens: { gte: total } },
            data:  { tokens: { decrement: total } },
          });
          if (debited.count === 0) throw new Error("Insufficient tokens");

          // Credit seller
          await tx.wallet.update({
            where: { id: sellerWallet.id },
            data:  { tokens: { increment: total } },
          });

          // Decrement stock (guarded) and mark sold out when depleted
          if (product.stock !== null) {
            const stocked = await tx.product.updateMany({
              where: { id: product.id, stock: { gte: quantity } },
              data:  { stock: { decrement: quantity } },
            });
            if (stocked.count === 0) throw new Error("Not enough stock");
            await tx.product.updateMany({ where: { id: product.id, stock: { lte: 0 } }, data: { status: "sold_out" } });
          }

          // Ledger entries on both sides
          await tx.walletTransaction.create({
            data: { walletId: buyerWallet.id, type: "marketplace_purchase", title: `Purchased "${product.title}" ×${quantity} (${paymentRef})`, amount: `-${total} tokens` },
          });
          await tx.walletTransaction.create({
            data: { walletId: sellerWallet.id, type: "marketplace_sale", title: `Sold "${product.title}" ×${quantity} (${paymentRef})`, amount: `+${total} tokens` },
          });

          return tx.order.create({
            data: {
              buyerId:    req.user.id,
              productId:  product.id,
              quantity,
              totalPrice: total,
              status:     "paid",
              paymentRef,
            },
            include: { product: { include: { seller: SELLER_SELECT } } },
          });
        }, { timeout: 20000 });

        const buyer = await app.prisma.user.findUnique({ where: { id: req.user.id }, select: { username: true, displayName: true } });
        wsHub.send(order.product.sellerId, {
          type: "marketplace:sale",
          orderId: order.id,
          productId: order.productId,
          tokens: order.totalPrice,
          buyer: { id: req.user.id, username: buyer?.username, displayName: buyer?.displayName },
        });

        return reply.status(201).send(order);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Purchase failed";
        const known = ["Product not found", "Product is sold out", "Cannot buy your own product", "Not enough stock", "Insufficient tokens"];
        if (known.includes(msg)) {
          return reply.status(msg === "Product not found" ? 404 : 400).send({ error: msg });
        }
        throw err;
      }
    }
  );

  // GET /marketplace/orders — buyer's order history
  app.get("/orders", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.order.findMany({
      where: { buyerId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { product: { include: { seller: SELLER_SELECT } } },
    });
  });

  // GET /marketplace/sales — seller's sales (orders on my products)
  app.get("/sales", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.order.findMany({
      where: { product: { sellerId: req.user.id } },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        product: { select: { id: true, title: true, mediaUrl: true, thumbUrl: true, price: true } },
        buyer:   SELLER_SELECT,
      },
    });
  });

  // PATCH /marketplace/orders/:id — seller marks a paid order fulfilled
  app.patch<{ Params: { id: string }; Body: { status: string } }>(
    "/orders/:id",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const order = await app.prisma.order.findUnique({ where: { id: req.params.id }, include: { product: true } });
      if (!order) return reply.status(404).send({ error: "Order not found" });
      if (order.product.sellerId !== req.user.id && !req.user.isAdmin) return reply.status(403).send({ error: "Forbidden" });
      if (req.body.status !== "fulfilled") return reply.status(400).send({ error: "status must be fulfilled" });
      if (order.status !== "paid") return reply.status(400).send({ error: "Only paid orders can be fulfilled" });

      return app.prisma.order.update({
        where: { id: req.params.id },
        data: { status: "fulfilled" },
        include: { product: { select: { id: true, title: true } }, buyer: SELLER_SELECT },
      });
    }
  );

  // ── Admin oversight ────────────────────────────────────────────────────────

  // GET /marketplace/admin/products — all products platform-wide
  app.get("/admin/products", { preHandler: [app.authenticateAdmin] }, async () => {
    return app.prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { seller: SELLER_SELECT, _count: { select: { orders: true } } },
    });
  });

  // GET /marketplace/admin/orders — all orders platform-wide
  app.get("/admin/orders", { preHandler: [app.authenticateAdmin] }, async () => {
    return app.prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        product: { select: { id: true, title: true, seller: SELLER_SELECT } },
        buyer:   SELLER_SELECT,
      },
    });
  });
}
