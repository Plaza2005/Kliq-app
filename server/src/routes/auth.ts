import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { sendVerificationEmail, sendPasswordResetEmail } from "../email";

// TODO(google-signin): set GOOGLE_CLIENT_ID in server/.env to your Google
// OAuth *Web* client ID (from Google Cloud / Firebase console). Until it is
// set, /auth/google returns 503 and the app falls back to email/username.
// See GOOGLE_SIGNIN_SETUP.md for the full steps.
const googleClient = new OAuth2Client();

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
      const verifyToken = crypto.randomBytes(32).toString("hex");
      const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const user = await app.prisma.user.create({
        data: {
          email, password: hash, displayName, username,
          emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry,
          ...(phone ? { phone } : {}),
        },
      });

      await app.prisma.activityLog.create({
        data: { actorId: user.id, action: "user.register", target: user.email },
      });

      sendVerificationEmail(email, verifyToken).catch(() => {});

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

  // POST /auth/google — sign in / sign up with a Google ID token.
  // The Flutter app obtains the token via google_sign_in and posts it here;
  // we verify it against Google, then find-or-create the user and issue OUR jwt.
  app.post<{ Body: { idToken: string } }>(
    "/google",
    async (req, reply) => {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) {
        return reply.status(503).send({
          error: "Google sign-in is not configured on the server (missing GOOGLE_CLIENT_ID)",
        });
      }
      const { idToken } = req.body;
      if (!idToken) return reply.status(400).send({ error: "idToken is required" });

      let payload;
      try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: clientId });
        payload = ticket.getPayload();
      } catch {
        return reply.status(401).send({ error: "Invalid Google token" });
      }
      if (!payload?.email) {
        return reply.status(401).send({ error: "Google token has no email" });
      }

      const email = payload.email.toLowerCase();
      let user = await app.prisma.user.findUnique({ where: { email } });

      if (!user) {
        // First Google sign-in → create the account.
        let username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
        if (await app.prisma.user.findUnique({ where: { username } })) {
          username = username + Math.floor(Math.random() * 9000 + 1000).toString();
        }
        // Random unusable password — this account signs in via Google.
        const randomPassword = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 12);
        user = await app.prisma.user.create({
          data: {
            email,
            password: randomPassword,
            displayName: payload.name || username,
            username,
            avatarUrl: payload.picture || null,
            emailVerified: Boolean(payload.email_verified),
          },
        });
        await app.prisma.activityLog.create({
          data: { actorId: user.id, action: "user.register", target: user.email },
        });
      }

      if (user.status === "banned") {
        return reply.status(403).send({ error: "Account banned" });
      }

      await app.prisma.activityLog.create({
        data: { actorId: user.id, action: "user.login", target: user.email },
      });

      const token = app.jwt.sign({ id: user.id, isAdmin: user.isAdmin }, { expiresIn: "7d" });
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

  // GET /auth/verify-email?token=xxx
  app.get<{ Querystring: { token: string } }>("/verify-email", async (req, reply) => {
    const { token } = req.query;
    if (!token) return reply.status(400).send({ error: "Missing token" });
    const user = await app.prisma.user.findFirst({
      where: { emailVerifyToken: token, emailVerifyExpiry: { gt: new Date() } },
    });
    if (!user) return reply.status(400).send({ error: "Invalid or expired token" });
    await app.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, emailVerifyToken: null, emailVerifyExpiry: null },
    });
    return { ok: true, message: "Email verified successfully" };
  });

  // POST /auth/resend-verification
  app.post("/resend-verification", { preHandler: [app.authenticate] }, async (req, reply) => {
    const user = await app.prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return reply.status(404).send({ error: "User not found" });
    if (user.emailVerified) return reply.status(400).send({ error: "Email already verified" });
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await app.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: verifyToken, emailVerifyExpiry: verifyExpiry },
    });
    await sendVerificationEmail(user.email, verifyToken);
    return { ok: true };
  });

  // POST /auth/forgot-password
  app.post<{ Body: { email: string } }>("/forgot-password", async (req, reply) => {
    const { email } = req.body;
    if (!email) return reply.status(400).send({ error: "Email is required" });
    const user = await app.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Always return 200 to avoid email enumeration
    if (!user) return { ok: true };
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await app.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: resetExpiry },
    });
    await sendPasswordResetEmail(user.email, resetToken).catch(() => {});
    return { ok: true };
  });

  // POST /auth/reset-password
  app.post<{ Body: { token: string; password: string } }>("/reset-password", async (req, reply) => {
    const { token, password } = req.body;
    if (!token || !password) return reply.status(400).send({ error: "token and password are required" });
    if (password.length < 8) return reply.status(400).send({ error: "Password must be at least 8 characters" });
    const user = await app.prisma.user.findFirst({
      where: { resetToken: token, resetTokenExpiry: { gt: new Date() } },
    });
    if (!user) return reply.status(400).send({ error: "Invalid or expired reset token" });
    const hash = await bcrypt.hash(password, 12);
    await app.prisma.user.update({
      where: { id: user.id },
      data: { password: hash, resetToken: null, resetTokenExpiry: null },
    });
    return { ok: true, message: "Password reset successfully" };
  });

  // POST /auth/change-password  (authenticated — verify current, set new)
  app.post<{ Body: { currentPassword: string; newPassword: string } }>(
    "/change-password",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return reply.status(400).send({ error: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 8) {
        return reply.status(400).send({ error: "New password must be at least 8 characters" });
      }
      const user = await app.prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) return reply.status(404).send({ error: "User not found" });
      const match = await bcrypt.compare(currentPassword, user.password);
      if (!match) return reply.status(401).send({ error: "Current password is incorrect" });
      const hash = await bcrypt.hash(newPassword, 12);
      await app.prisma.user.update({ where: { id: user.id }, data: { password: hash } });
      return { ok: true, message: "Password changed successfully" };
    }
  );

  // PATCH /auth/me  (update own profile)
  app.patch<{ Body: { username?: string; displayName?: string; bio?: string; avatarUrl?: string; coverUrl?: string; phone?: string; dateOfBirth?: string; isOnboarded?: boolean } }>(
    "/me",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { username, displayName, bio, avatarUrl, coverUrl, phone, dateOfBirth, isOnboarded } = req.body;

      if (username !== undefined) {
        const clean = username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
        if (clean.length < 3) return reply.status(400).send({ error: "Username must be at least 3 characters" });
        const taken = await app.prisma.user.findFirst({ where: { username: clean, NOT: { id: req.user.id } } });
        if (taken) return reply.status(409).send({ error: "Username already taken" });
      }

      const dobDate = dateOfBirth ? new Date(dateOfBirth) : undefined;

      const user = await app.prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(username    !== undefined && { username: username.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20) }),
          ...(displayName !== undefined && { displayName }),
          ...(bio         !== undefined && { bio }),
          ...(avatarUrl   !== undefined && { avatarUrl }),
          ...(coverUrl    !== undefined && { coverUrl }),
          ...(phone       !== undefined && { phone }),
          ...(dobDate     !== undefined && { dateOfBirth: dobDate }),
          ...(isOnboarded !== undefined && { isOnboarded: isOnboarded === true }),
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
    avatarUrl:       u.avatarUrl,
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
