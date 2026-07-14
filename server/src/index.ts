import Fastify, { FastifyRequest, FastifyReply } from "fastify";
import cors from "@fastify/cors";
import fjwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import staticPlugin from "@fastify/static";
import websocket from "@fastify/websocket";
import rateLimit from "@fastify/rate-limit";
import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { postRoutes } from "./routes/posts";
import { notificationRoutes } from "./routes/notifications";
import { messageRoutes } from "./routes/messages";
import { adminRoutes } from "./routes/admin";
import { searchRoutes } from "./routes/search";
import { analyticsRoutes } from "./routes/analytics";
import { walletRoutes } from "./routes/wallet";
import { amplifyRoutes } from "./routes/amplify";
import { storyRoutes } from "./routes/stories";
import { communityRoutes } from "./routes/communities";
import { kliqstreamRoutes } from "./routes/kliqstream";
import { liveRoutes } from "./routes/live";
import { sessionRoutes } from "./routes/sessions";
import { blockRoutes } from "./routes/blocks";
import { bookmarkRoutes } from "./routes/bookmarks";
import { hashtagRoutes } from "./routes/hashtags";
import { soundRoutes } from "./routes/sounds";
import { pollRoutes } from "./routes/polls";
import { groupRoutes } from "./routes/groups";
import { subscriptionRoutes } from "./routes/subscriptions";
import { marketplaceRoutes } from "./routes/marketplace";
import { wsHub, subscribeToStream, unsubscribeFromStream, broadcastToStream, subscriberCount, setLastChunk, getLastChunk } from "./ws";
import { startBackgroundJobs } from "./jobs";
import { getPresignedUploadUrl, R2_PUBLIC_URL } from "./storage";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authenticateAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    user: { id: string; isAdmin: boolean };
  }
}

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const prisma = new PrismaClient();
const app = Fastify({ logger: { level: "warn" } });

// ── Plugins ────────────────────────────────────────────────────────────────
app.register(rateLimit, {
  max: 120,           // 120 requests per minute globally
  timeWindow: "1 minute",
  errorResponseBuilder: () => ({ error: "Too many requests, slow down." }),
});

app.register(cors, {
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

app.register(fjwt, {
  secret: process.env.JWT_SECRET || "kliq-dev-secret",
});

app.register(multipart, {
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
});

app.register(staticPlugin, {
  root: UPLOADS_DIR,
  prefix: "/uploads/",
});

app.register(websocket);

// ── Prisma decoration ──────────────────────────────────────────────────────
app.decorate("prisma", prisma);

// ── Auth decorators ────────────────────────────────────────────────────────
app.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

app.decorate("authenticateAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
  try {
    await req.jwtVerify();
    if (!req.user.isAdmin) {
      reply.status(403).send({ error: "Forbidden: admin only" });
    }
  } catch {
    reply.status(401).send({ error: "Unauthorized" });
  }
});

// ── WebSocket endpoint ─────────────────────────────────────────────────────
// Lightweight frame-relay stats logged via console.log since the fastify
// logger level is "warn" (app.log.* below that level is silent).
const frameStats = new Map<string, { received: number }>();

// Client connects as: ws://<host>:4000/ws?token=<jwt>
app.get<{ Querystring: { token?: string } }>(
  "/ws",
  { websocket: true },
  (connection, req) => {
    const ws = connection.socket; // raw ws.WebSocket — has .send(), .readyState, .terminate()

    let userId: string | null = null;
    try {
      const token = req.query.token;
      if (!token) throw new Error("no token");
      const payload = app.jwt.verify<{ id: string }>(token);
      userId = payload.id;
    } catch {
      try { ws.terminate(); } catch { /* ignore */ }
      return;
    }

    wsHub.register(userId, ws);
    ws.send(JSON.stringify({ type: "connected", userId }));

    const mySubs = new Set<string>();

    const logFrame = (streamId: string, relayed: number) => {
      const stats = frameStats.get(streamId) ?? { received: 0 };
      stats.received++;
      frameStats.set(streamId, stats);
      const n = stats.received;
      if (n === 1 || n % 100 === 0) {
        console.log(`[live] ${streamId} frames=${n} subs=${subscriberCount(streamId)} relayedTo=${relayed}`);
      }
      if (n === 1 && relayed === 0) {
        console.log(`[live] ${streamId} stream:chunk received but 0 subscribers`);
      }
    };

    ws.on("message", (raw: Buffer | string) => {
      try {
        const msg = JSON.parse(raw.toString()) as { type: string; streamId?: string; chunk?: unknown; body?: string; fromUsername?: string };
        if (msg.type === "stream:subscribe" && msg.streamId && userId) {
          subscribeToStream(msg.streamId, ws);
          mySubs.add(msg.streamId);
          console.log(`[live] subscribe user=${userId} stream=${msg.streamId} subs=${subscriberCount(msg.streamId)}`);
          const cached = getLastChunk(msg.streamId);
          if (cached !== undefined) {
            ws.send(JSON.stringify({ type: "live:chunk", streamId: msg.streamId, chunk: cached }));
          }
        } else if (msg.type === "stream:unsubscribe" && msg.streamId && userId) {
          unsubscribeFromStream(msg.streamId, ws);
          mySubs.delete(msg.streamId);
          console.log(`[live] unsubscribe user=${userId} stream=${msg.streamId} subs=${subscriberCount(msg.streamId)}`);
        } else if (msg.type === "stream:chunk" && msg.streamId) {
          if (typeof msg.chunk === "string") setLastChunk(msg.streamId, msg.chunk);
          const relayed = broadcastToStream(msg.streamId, { type: "live:chunk", streamId: msg.streamId, chunk: msg.chunk }, ws);
          logFrame(msg.streamId, relayed);
        } else if (msg.type === "live:chunk" && msg.streamId) {
          if (typeof msg.chunk === "string") setLastChunk(msg.streamId, msg.chunk);
          const relayed = broadcastToStream(msg.streamId, { type: "live:chunk", streamId: msg.streamId, chunk: msg.chunk }, ws);
          logFrame(msg.streamId, relayed);
        } else if (msg.type === "live:chat" && msg.streamId) {
          broadcastToStream(msg.streamId, { type: "live:chat", streamId: msg.streamId, body: msg.body, fromUsername: msg.fromUsername ?? "viewer" });
        }
      } catch {
        // ignore malformed messages
      }
    });

    const cleanup = () => {
      if (userId) wsHub.unregister(userId, ws);
      for (const streamId of mySubs) unsubscribeFromStream(streamId, ws);
      mySubs.clear();
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  }
);

// ── File upload endpoint ───────────────────────────────────────────────────
app.post("/upload", { preHandler: [app.authenticate] }, async (req, reply) => {
  const data = await req.file();
  if (!data) return reply.status(400).send({ error: "No file provided" });

  const ext = path.extname(data.filename).toLowerCase() || ".bin";
  const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".mp4", ".mov", ".webm", ".mp3", ".wav", ".ogg", ".aac", ".m4a"];
  if (!allowed.includes(ext)) {
    return reply.status(400).send({ error: "File type not allowed" });
  }

  const filename = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

  const chunks: Buffer[] = [];
  for await (const chunk of data.file) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);

  // ── Supabase Storage (preferred, when configured) ──
  // Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + SUPABASE_STORAGE_BUCKET.
  // The bucket must be Public so the returned URL is directly viewable.
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  if (supabaseUrl && serviceKey && bucket) {
    try {
      const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${filename}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": data.mimetype || "application/octet-stream",
          "x-upsert": "true",
        },
        body: buffer,
      });
      if (res.ok) {
        const url = `${supabaseUrl}/storage/v1/object/public/${bucket}/${filename}`;
        return { url, filename };
      }
      req.log.error({ status: res.status, body: await res.text() }, "Supabase Storage upload failed — falling back to local");
    } catch (err) {
      req.log.error(err, "Supabase Storage upload threw — falling back to local");
    }
  }

  // ── Local disk fallback ──
  // Root-relative path so clients resolve it against their own origin.
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  const url = `/uploads/${filename}`;
  return { url, filename };
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.register(authRoutes,         { prefix: "/auth" });
app.register(userRoutes,         { prefix: "/users" });
app.register(postRoutes,         { prefix: "/posts" });
app.register(notificationRoutes, { prefix: "/notifications" });
app.register(messageRoutes,      { prefix: "/messages" });
app.register(adminRoutes,        { prefix: "/admin" });
app.register(searchRoutes,       { prefix: "/search" });
app.register(analyticsRoutes,    { prefix: "/analytics" });
app.register(walletRoutes,       { prefix: "/wallet" });
app.register(amplifyRoutes,      { prefix: "/amplify" });
app.register(storyRoutes,        { prefix: "/stories" });
app.register(communityRoutes,    { prefix: "/communities" });
app.register(kliqstreamRoutes,   { prefix: "/kliqstream" });
app.register(liveRoutes,         { prefix: "/live" });
app.register(sessionRoutes,      { prefix: "/sessions" });
app.register(blockRoutes,        { prefix: "/blocks" });
app.register(bookmarkRoutes,     { prefix: "/bookmarks" });
app.register(hashtagRoutes,      { prefix: "/hashtags" });
app.register(soundRoutes,        { prefix: "/sounds" });
app.register(pollRoutes,         { prefix: "/polls" });
app.register(groupRoutes,        { prefix: "/groups" });
app.register(subscriptionRoutes, { prefix: "/subscriptions" });
app.register(marketplaceRoutes,  { prefix: "/marketplace" });

app.get("/", () => ({ name: "KLIQ API", status: "ok", version: "1.0.0" }));
app.get("/health", () => ({ status: "ok", timestamp: new Date().toISOString() }));

// ── Cloudflare R2 presigned upload URL ────────────────────────────────────
app.post<{ Body: { filename: string; contentType: string } }>(
  "/media/upload-url",
  { preHandler: [app.authenticate] },
  async (req, reply) => {
    const { filename, contentType } = req.body;
    if (!filename || !contentType) return reply.status(400).send({ error: "filename and contentType required" });
    try {
      const { uploadUrl, publicUrl } = await getPresignedUploadUrl(filename, contentType);
      return { uploadUrl, publicUrl };
    } catch {
      return reply.status(503).send({ error: "Storage not configured — using local uploads" });
    }
  }
);

// ── Media failure reporting ────────────────────────────────────────────────
app.post<{ Body: { url: string; context?: string } }>(
  "/media/report-failure",
  { preHandler: [app.authenticate] },
  async (req) => {
    const { url, context } = req.body;
    await app.prisma.activityLog.create({
      data: {
        actorId: req.user.id,
        action:  "media.failure",
        target:  url,
        details: context ?? null,
      },
    });
    return { ok: true };
  }
);

// ── Region / locale detection ──────────────────────────────────────────────
const TZ_CURRENCY: Record<string, { currency: string; symbol: string; locale: string; country: string }> = {
  "Africa/Johannesburg": { currency: "ZAR", symbol: "R",    locale: "en-ZA", country: "South Africa" },
  "Africa/Lagos":        { currency: "NGN", symbol: "₦",    locale: "en-NG", country: "Nigeria" },
  "Africa/Nairobi":      { currency: "KES", symbol: "KSh",  locale: "en-KE", country: "Kenya" },
  "Africa/Accra":        { currency: "GHS", symbol: "₵",    locale: "en-GH", country: "Ghana" },
  "Africa/Cairo":        { currency: "EGP", symbol: "E£",   locale: "ar-EG", country: "Egypt" },
  "Africa/Casablanca":   { currency: "MAD", symbol: "DH",   locale: "ar-MA", country: "Morocco" },
  "Africa/Addis_Ababa":  { currency: "ETB", symbol: "Br",   locale: "am-ET", country: "Ethiopia" },
  "Africa/Dar_es_Salaam":{ currency: "TZS", symbol: "TSh",  locale: "sw-TZ", country: "Tanzania" },
  "Africa/Kampala":      { currency: "UGX", symbol: "USh",  locale: "en-UG", country: "Uganda" },
  "Africa/Abidjan":      { currency: "XOF", symbol: "CFA",  locale: "fr-CI", country: "Ivory Coast" },
  "Africa/Dakar":        { currency: "XOF", symbol: "CFA",  locale: "fr-SN", country: "Senegal" },
  "Africa/Douala":       { currency: "XAF", symbol: "FCFA", locale: "fr-CM", country: "Cameroon" },
  "Africa/Algiers":      { currency: "DZD", symbol: "DA",   locale: "ar-DZ", country: "Algeria" },
  "Africa/Tunis":        { currency: "TND", symbol: "DT",   locale: "ar-TN", country: "Tunisia" },
  "Africa/Lusaka":       { currency: "ZMW", symbol: "ZK",   locale: "en-ZM", country: "Zambia" },
  "Africa/Gaborone":     { currency: "BWP", symbol: "P",    locale: "en-BW", country: "Botswana" },
  "Africa/Blantyre":     { currency: "MWK", symbol: "MK",   locale: "en-MW", country: "Malawi" },
  "Africa/Maputo":       { currency: "MZN", symbol: "MT",   locale: "pt-MZ", country: "Mozambique" },
  "Africa/Kigali":       { currency: "RWF", symbol: "RF",   locale: "rw-RW", country: "Rwanda" },
  "Africa/Windhoek":     { currency: "NAD", symbol: "N$",   locale: "en-NA", country: "Namibia" },
  "Africa/Harare":       { currency: "USD", symbol: "$",    locale: "en-ZW", country: "Zimbabwe" },
  "Africa/Luanda":       { currency: "AOA", symbol: "Kz",   locale: "pt-AO", country: "Angola" },
  "Africa/Mogadishu":    { currency: "SOS", symbol: "Sh",   locale: "so-SO", country: "Somalia" },
  "Africa/Tripoli":      { currency: "LYD", symbol: "LD",   locale: "ar-LY", country: "Libya" },
};

app.get("/region", () => {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const info = TZ_CURRENCY[tz] ?? { currency: "USD", symbol: "$", locale: "en-US", country: "Unknown" };
  return { timezone: tz, ...info };
});

// ── Start ──────────────────────────────────────────────────────────────────
const start = async () => {
  const port = parseInt(process.env.PORT || "4000");
  await app.listen({ port, host: "0.0.0.0" });
  startBackgroundJobs(prisma);
  console.log(`\n🚀  KLIQ API running on http://localhost:${port}`);
  console.log(`   WS:     ws://localhost:${port}/ws?token=<jwt>`);
  console.log(`   Admin:  POST /auth/login  { email: "admin@kliq.app", password: "Admin1234!" }`);
  console.log(`   Files:  http://localhost:${port}/uploads/<filename>\n`);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
