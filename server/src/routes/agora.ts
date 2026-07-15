import { FastifyInstance } from "fastify";
import { RtcTokenBuilder, RtcRole } from "agora-token";

// Both the token itself and the client's local "stay in channel" privilege
// share this window — plenty for a call; the client can request a fresh
// token via the same endpoint if a call somehow runs longer.
const TOKEN_EXPIRE_SECONDS = 3600; // 1 hour

/// Builds a signed Agora RTC token for the given channel/uid, or `null` if
/// AGORA_APP_ID / AGORA_APP_CERTIFICATE aren't configured yet. Real values
/// come from an Agora Console project — see server/.env.example. Shared by
/// this route and routes/calls.ts (which mints a token as part of
/// `POST /calls`) so the signing logic lives in exactly one place.
export function buildAgoraRtcToken(
  channel: string,
  uid: number | string = 0,
  role: "publisher" | "subscriber" = "publisher"
): { token: string; appId: string; expiresAt: number } | null {
  const appId = process.env.AGORA_APP_ID;
  const appCertificate = process.env.AGORA_APP_CERTIFICATE;
  if (!appId || !appCertificate) return null;

  const token = RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channel,
    uid,
    role === "publisher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER,
    TOKEN_EXPIRE_SECONDS,
    TOKEN_EXPIRE_SECONDS
  );
  const expiresAt = Math.floor(Date.now() / 1000) + TOKEN_EXPIRE_SECONDS;
  return { token, appId, expiresAt };
}

export async function agoraRoutes(app: FastifyInstance) {
  // POST /agora/rtc-token — mint a token for the caller to join an Agora
  // RTC channel. uid defaults to 0 ("any uid may join with this token"),
  // which is the simplest option since Agora client SDKs can auto-assign
  // a uid on join.
  app.post<{ Body: { channel?: string; uid?: number; role?: "publisher" | "subscriber" } }>(
    "/rtc-token",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { channel, uid, role } = req.body ?? {};
      if (!channel) return reply.status(400).send({ error: "channel required" });

      const result = buildAgoraRtcToken(channel, uid ?? 0, role ?? "publisher");
      if (!result) {
        return reply.status(503).send({
          error:
            "Agora not configured — set AGORA_APP_ID and AGORA_APP_CERTIFICATE in the server .env (see .env.example) before calls will work",
        });
      }
      return result;
    }
  );
}
