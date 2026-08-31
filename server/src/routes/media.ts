import { FastifyInstance } from "fastify";
import { getPresignedUploadUrl } from "../storage";

export async function mediaRoutes(app: FastifyInstance) {
  // POST /media/upload-target — register metadata record & return presigned Cloudflare upload target
  app.post<{
    Body: {
      filename: string;
      contentType: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
      durationSeconds?: number;
    };
  }>(
    "/upload-target",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { filename, contentType, sizeBytes, width, height, durationSeconds } = req.body ?? {};
      if (!filename || !contentType) {
        return reply.status(400).send({ error: "filename and contentType required" });
      }

      let uploadUrl = "";
      let publicUrl = "";
      let storageProvider = "cf_r2";

      try {
        const result = await getPresignedUploadUrl(filename, contentType);
        uploadUrl = result.uploadUrl;
        publicUrl = result.publicUrl;
      } catch {
        // Fallback to local upload endpoint if Cloudflare R2 is unconfigured
        storageProvider = "local";
        publicUrl = `/uploads/${filename}`;
        uploadUrl = `${process.env.API_URL || "http://localhost:4000"}/upload`;
      }

      const mediaObject = await app.prisma.mediaObject.create({
        data: {
          ownerId: req.user.id,
          storageProvider,
          objectKey: filename,
          publicUrl,
          mimeType: contentType,
          sizeBytes: sizeBytes ?? 0,
          width: width ?? null,
          height: height ?? null,
          durationSeconds: durationSeconds ?? null,
          status: "upload_pending",
        },
      });

      return {
        mediaObjectId: mediaObject.id,
        uploadUrl,
        publicUrl,
        storageProvider,
      };
    }
  );

  // POST /media/confirm — confirm direct binary upload completion & flip status to ready
  app.post<{ Body: { mediaObjectId: string; status?: "ready" | "error" } }>(
    "/confirm",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { mediaObjectId, status = "ready" } = req.body ?? {};
      if (!mediaObjectId) return reply.status(400).send({ error: "mediaObjectId required" });

      const mediaObject = await app.prisma.mediaObject.findUnique({ where: { id: mediaObjectId } });
      if (!mediaObject) return reply.status(404).send({ error: "Media object not found" });
      if (mediaObject.ownerId !== req.user.id) return reply.status(403).send({ error: "Forbidden" });

      const updated = await app.prisma.mediaObject.update({
        where: { id: mediaObjectId },
        data: { status },
      });

      return {
        mediaObjectId: updated.id,
        status: updated.status,
        publicUrl: updated.publicUrl,
      };
    }
  );
}
