import { FastifyInstance } from "fastify";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as crypto from "crypto";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

import { uploadBufferToSupabase } from "../supabase-storage";

if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);

// ── Limits ───────────────────────────────────────────────────────────────
// Short-clip stickers only: keep the source video tiny so conversion is fast
// and the resulting animated sticker stays chat-sized.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // ~10MB
const MAX_DURATION_SECONDS = 6.5; // small tolerance over the advertised ~6s
const STICKER_MAX_DIMENSION = 480;

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

/** Parses fluent-ffmpeg's `codecData.duration` string ("00:00:07.20") to seconds. */
function parseFfmpegDuration(duration: string | undefined): number {
  if (!duration) return 0;
  const m = /^(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(duration.trim());
  if (!m) return 0;
  const [, h, mnt, s] = m;
  return Number(h) * 3600 + Number(mnt) * 60 + Number(s);
}

/**
 * Stores a converted/uploaded sticker buffer using the same storage the rest
 * of the app uses (Supabase Storage when configured via env vars, else the
 * local `uploads/` disk fallback) — mirrors `POST /upload` in src/index.ts so
 * there is one place stickers actually end up.
 */
async function saveStickerBuffer(buffer: Buffer, filename: string, contentType: string): Promise<string> {
  const supabaseUrl = await uploadBufferToSupabase(buffer, filename, contentType);
  if (supabaseUrl) return supabaseUrl;
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
  return `/uploads/${filename}`;
}

class DurationExceededError extends Error {
  constructor() {
    super("DURATION_EXCEEDED");
  }
}

interface ConvertResult {
  outputPath: string;
  contentType: string;
  ext: string;
}

/**
 * Runs one ffmpeg pass converting `inputPath` to either an animated WebP
 * (preferred — smaller) or a GIF (fallback, used if the bundled ffmpeg build's
 * animated-WebP encoding fails). Scales to fit within
 * STICKER_MAX_DIMENSION on the long edge and caps output duration at
 * MAX_DURATION_SECONDS. Aborts early (via the `codecData` event, which ffmpeg
 * emits as soon as it has parsed input metadata) if the source video is
 * longer than the allowed duration, so we don't waste time encoding it.
 */
function convertVideo(inputPath: string, format: "webp" | "gif"): Promise<ConvertResult> {
  return new Promise((resolve, reject) => {
    const outExt = format === "webp" ? ".webp" : ".gif";
    const outputPath = path.join(os.tmpdir(), `sticker-out-${crypto.randomBytes(8).toString("hex")}${outExt}`);
    const scaleFilter =
      `scale='min(${STICKER_MAX_DIMENSION},iw)':'min(${STICKER_MAX_DIMENSION},ih)':force_original_aspect_ratio=decrease`;
    let rejectedForDuration = false;

    const command = ffmpeg(inputPath)
      .on("codecData", (info: { duration?: string }) => {
        const seconds = parseFfmpegDuration(info.duration);
        if (seconds > MAX_DURATION_SECONDS) {
          rejectedForDuration = true;
          command.kill("SIGKILL");
        }
      })
      .on("error", (err: Error) => {
        try { fs.unlinkSync(outputPath); } catch { /* ignore */ }
        reject(rejectedForDuration ? new DurationExceededError() : err);
      })
      .on("end", () => resolve({ outputPath, contentType: format === "webp" ? "image/webp" : "image/gif", ext: outExt }))
      .videoFilters(`${scaleFilter},fps=${format === "webp" ? 15 : 12}`)
      .duration(MAX_DURATION_SECONDS)
      .noAudio();

    if (format === "webp") {
      command.outputOptions(["-loop", "0", "-vcodec", "libwebp_anim", "-q:v", "60", "-compression_level", "6", "-preset", "default"]);
    } else {
      command.outputOptions(["-loop", "0"]);
    }

    command.save(outputPath);
  });
}

export async function stickerRoutes(app: FastifyInstance) {
  // POST /stickers/convert — short video -> animated WebP/GIF sticker.
  app.post("/convert", { preHandler: [app.authenticate] }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: "No video file provided" });

    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of data.file) {
      total += chunk.length;
      if (total > MAX_UPLOAD_BYTES) {
        // Drain the rest of the stream so fastify-multipart doesn't hang.
        for await (const _ of data.file) { /* discard */ }
        return reply.status(400).send({ error: "Video too large — max 10MB" });
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const inputExt = path.extname(data.filename || "").toLowerCase() || ".mp4";
    const inputPath = path.join(os.tmpdir(), `sticker-in-${crypto.randomBytes(8).toString("hex")}${inputExt}`);
    fs.writeFileSync(inputPath, buffer);

    try {
      let result: ConvertResult;
      try {
        result = await convertVideo(inputPath, "webp");
      } catch (err) {
        if (err instanceof DurationExceededError) throw err;
        req.log.warn({ err }, "Animated WebP sticker conversion failed — falling back to GIF");
        result = await convertVideo(inputPath, "gif");
      }

      const outBuffer = fs.readFileSync(result.outputPath);
      try { fs.unlinkSync(result.outputPath); } catch { /* ignore */ }

      const filename = `sticker-${Date.now()}-${crypto.randomBytes(6).toString("hex")}${result.ext}`;
      const url = await saveStickerBuffer(outBuffer, filename, result.contentType);

      const sticker = await app.prisma.sticker.create({
        data: { ownerId: req.user.id, url, sourceType: "converted" },
      });
      return sticker;
    } catch (err) {
      if (err instanceof DurationExceededError) {
        return reply.status(400).send({ error: `Video too long — max ${Math.round(MAX_DURATION_SECONDS)}s` });
      }
      req.log.error({ err }, "Sticker conversion failed");
      return reply.status(500).send({ error: "Could not convert video to sticker" });
    } finally {
      try { fs.unlinkSync(inputPath); } catch { /* ignore */ }
    }
  });

  // GET /stickers — current user's saved sticker library.
  app.get("/", { preHandler: [app.authenticate] }, async (req) => {
    return app.prisma.sticker.findMany({
      where: { ownerId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
  });

  // POST /stickers — save an existing media URL (image, or /stickers/convert
  // output) into the current user's library. This is the "long-press to save"
  // path from comments/chat.
  app.post<{ Body: { url?: string; width?: number; height?: number; sourceType?: string } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { url, width, height, sourceType } = req.body ?? {};
      if (!url) return reply.status(400).send({ error: "url required" });
      const sticker = await app.prisma.sticker.upsert({
        where: { ownerId_url: { ownerId: req.user.id, url } },
        create: { ownerId: req.user.id, url, width, height, sourceType: sourceType ?? "upload" },
        update: {},
      });
      return sticker;
    },
  );

  // DELETE /stickers/:id — remove a sticker from the current user's library.
  app.delete<{ Params: { id: string } }>("/:id", { preHandler: [app.authenticate] }, async (req, reply) => {
    const sticker = await app.prisma.sticker.findUnique({ where: { id: req.params.id } });
    if (!sticker || sticker.ownerId !== req.user.id) {
      return reply.status(404).send({ error: "Sticker not found" });
    }
    await app.prisma.sticker.delete({ where: { id: req.params.id } });
    return { deleted: true };
  });
}
