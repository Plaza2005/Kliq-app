import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";

export async function authRoutes(app: FastifyInstance) {
  // POST /auth/register
  app.post<{ Body: { email: string; password: string; displayName: string; username?: string; phone?: string } }>(
    "/register",
    async (req, reply) => {
      const { email, password, displayName, phone } = req.body;
      let { username } = req.body;

      if (!email || !password || !displayName) {
        return reply.status(400).send({ error: "email, password and displayName are required" });
      }
      if (password.length < 8) {
        return reply.status(400).send({ error: "Password must be at least 8 characters" });
      }

      const emailExists = await app.prisma.user.findUnique({ where: { email } });
      if (emailExists) {
        return reply.status(409).send({ error: "Email already registered" });
      }

      if (username) {
        username = username.toLowerCase().replace(/[^a-z0-9_]/g, "");
        const taken = await app.prisma.user.findUnique({ where: { username } });
        if (taken) {
          return reply.status(409).send({ error: "Username already taken" });
        }
      } else {
        username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
        const taken = await app.prisma.user.findUnique({ where: { username } });
        if (taken) username = username + Math.floor(Math.random() * 9000 + 1000).toString();
      }

      const hash = await bcrypt.hash(password, 12);
      const user = await app.prisma.user.create({
        data: { email, password: hash, displayName, username, ...(phone ? { phone } : {}) },
      });

      await app.prisma.activityLog.create({
        data: { actorId: user.id, action: "user.register", target: user.email },
      });

      const token = app.jwt.sign(
        { id: user.id, isAdmin: user.isAdmin },
        { expiresIn: "7d" }
      );

      return reply.status(201).send({
        token,
        user: sanitize(user),
      });
    }
  );

  // POST /auth/login
  app.post<{ Body: { identifier: string; password: string } }>(
    "/login",
    async (req, reply) => {
      const { identifier, password } = req.body;
      if (!identifier || !password) {
        return reply.status(400).send({ error: "identifier and password are required" });
      }

      const user = await app.prisma.user.findFirst({
        where: {
          OR: [
            { email: identifier.toLowerCase() },
            { username: identifier.toLowerCase() },
          ],
        },
      });
      if (!user) return reply.status(401).send({ error: "Invalid credentials" });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return reply.status(401).send({ error: "Invalid credentials" });

      if (user.status === "banned") {
        return reply.status(403).send({ error: "Account banned" });
      }

      await app.prisma.activityLog.create({
        data: { actorId: user.id, action: "user.login", target: user.email },
      });

      const token = app.jwt.sign(
        { id: user.id, isAdmin: user.isAdmin },
        { expiresIn: "7d" }
      );

      return { token, user: sanitize(user) };
    }
  );

  // GET /auth/me
  app.get(
    "/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return reply.status(404).send({ error: "User not found" });
      return sanitize(user);
    }
  );

  // PATCH /auth/me  (update own profile)
  app.patch<{ Body: { username?: string; displayName?: string; bio?: string; avatarUrl?: string; coverUrl?: string; phone?: string } }>(
    "/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { username, displayName, bio, avatarUrl, coverUrl, phone } = req.body;

      if (username !== undefined) {
        const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        if (clean.length < 3) return reply.status(400).send({ error: "Username must be at least 3 characters" });
        const taken = await app.prisma.user.findFirst({ where: { username: clean, NOT: { id: req.user.id } } });
        if (taken) return reply.status(409).send({ error: "Username already taken" });
      }

      const user = await app.prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(username    !== undefined && { username: username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) }),
          ...(displayName !== undefined && { displayName }),
          ...(bio         !== undefined && { bio }),
          ...(avatarUrl   !== undefined && { avatarUrl }),
          ...(coverUrl    !== undefined && { coverUrl }),
          ...(phone       !== undefined && { phone }),
        },
      });
      return sanitize(user);
    }
  );
}

function sanitize(u: { id: string; username: string; email: string; displayName: string; bio: string; avatarUrl: string | null; coverUrl: string | null; phone?: string | null; tier: string; isVerified: boolean; isAdmin: boolean; status: string; followerCount: number; followingCount: number; postCount: number; isOnboarded?: boolean; notifPrefs?: string | null; privacySettings?: string | null; createdAt: Date }) {
  return {
    id:              u.id,
    username:        u.username,
    email:           u.email,
    displayName:     u.displayName,
    bio:             u.bio,
    avatarUrl:       u.avatarUrl ?? `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`,
    coverUrl:        u.coverUrl,
    phone:           u.phone ?? null,
    tier:            u.tier,
    isVerified:      u.isVerified,
    isOnboarded:     u.isOnboarded ?? false,
    isAdmin:         u.isAdmin,
    status:          u.status,
    followerCount:   u.followerCount,
    followingCount:  u.followingCount,
    postCount:       u.postCount,
    notifPrefs:      u.notifPrefs ?? null,
    privacySettings: u.privacySettings ?? null,
    createdAt:       u.createdAt,
  };
}
