import { FastifyInstance } from "fastify";
import * as crypto from "crypto";
import { wsHub } from "../ws";
import { buildAgoraRtcToken } from "./agora";

/// Voice/video call signaling. The Call row in Postgres is the record of
/// truth (who called whom, when, how it ended); the actual "phone ringing"
/// signal is pushed instantly over the existing wsHub (same per-user
/// pub/sub used for message:new etc. in routes/messages.ts) rather than
/// polled — call:invite to the callee, call:accept/call:reject back to the
/// caller, call:end to whichever side didn't hang up.

function serializeCall(c: {
  id: string; channel: string; type: string; status: string;
  callerId: string; calleeId: string;
  startedAt: Date | null; endedAt: Date | null; createdAt: Date;
}) {
  return {
    id: c.id,
    channel: c.channel,
    type: c.type,
    status: c.status,
    callerId: c.callerId,
    calleeId: c.calleeId,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    createdAt: c.createdAt,
  };
}

export async function callRoutes(app: FastifyInstance) {
  // POST /calls  { calleeId, type }  — create a Call + ring the callee.
  // Also mints an RTC token up front for the caller (who navigates straight
  // into the "ringing" call screen and needs to join as soon as the callee
  // accepts) so the client doesn't need a second round trip.
  app.post<{ Body: { calleeId?: string; type?: "voice" | "video" } }>(
    "/",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { calleeId, type } = req.body ?? {};
      if (!calleeId) return reply.status(400).send({ error: "calleeId required" });
      if (calleeId === req.user.id) return reply.status(400).send({ error: "Cannot call yourself" });

      const callee = await app.prisma.user.findUnique({ where: { id: calleeId } });
      if (!callee) return reply.status(404).send({ error: "User not found" });

      const caller = await app.prisma.user.findUnique({ where: { id: req.user.id } });
      const channel = `call-${crypto.randomUUID()}`;

      const call = await app.prisma.call.create({
        data: {
          callerId: req.user.id,
          calleeId,
          channel,
          type: type === "video" ? "video" : "voice",
          status: "ringing",
        },
      });

      wsHub.send(calleeId, {
        type: "call:invite",
        callId: call.id,
        channel: call.channel,
        callType: call.type,
        caller: caller ? {
          id: caller.id,
          username: caller.username,
          displayName: caller.displayName,
          avatarUrl: caller.avatarUrl,
        } : null,
      });

      const token = buildAgoraRtcToken(channel, 0, "publisher");
      return reply.status(201).send({ ...serializeCall(call), ...(token ?? {}) });
    }
  );

  // POST /calls/:id/accept — callee answers. Flips status, timestamps the
  // start, and tells the caller (over WS) it's safe to join the channel.
  app.post<{ Params: { id: string } }>(
    "/:id/accept",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const call = await app.prisma.call.findUnique({ where: { id: req.params.id } });
      if (!call) return reply.status(404).send({ error: "Call not found" });
      if (call.calleeId !== req.user.id) return reply.status(403).send({ error: "Not your call to accept" });
      if (call.status !== "ringing") return reply.status(400).send({ error: `Call already ${call.status}` });

      const updated = await app.prisma.call.update({
        where: { id: call.id },
        data: { status: "accepted", startedAt: new Date() },
      });

      wsHub.send(call.callerId, { type: "call:accept", callId: call.id, channel: call.channel });

      const token = buildAgoraRtcToken(call.channel, 0, "publisher");
      return { ...serializeCall(updated), ...(token ?? {}) };
    }
  );

  // POST /calls/:id/reject — callee declines a still-ringing call.
  app.post<{ Params: { id: string } }>(
    "/:id/reject",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const call = await app.prisma.call.findUnique({ where: { id: req.params.id } });
      if (!call) return reply.status(404).send({ error: "Call not found" });
      if (call.calleeId !== req.user.id) return reply.status(403).send({ error: "Not your call to reject" });
      if (call.status !== "ringing") return reply.status(400).send({ error: `Call already ${call.status}` });

      const updated = await app.prisma.call.update({
        where: { id: call.id },
        data: { status: "rejected", endedAt: new Date() },
      });

      wsHub.send(call.callerId, { type: "call:reject", callId: call.id });

      return serializeCall(updated);
    }
  );

  // POST /calls/:id/end — either side hangs up (or the caller cancels a
  // still-ringing call, which resolves as "missed" rather than "ended").
  app.post<{ Params: { id: string } }>(
    "/:id/end",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const call = await app.prisma.call.findUnique({ where: { id: req.params.id } });
      if (!call) return reply.status(404).send({ error: "Call not found" });
      if (call.callerId !== req.user.id && call.calleeId !== req.user.id) {
        return reply.status(403).send({ error: "Not a participant" });
      }
      if (call.status === "ended" || call.status === "rejected" || call.status === "missed") {
        return serializeCall(call);
      }

      const updated = await app.prisma.call.update({
        where: { id: call.id },
        data: {
          status: call.status === "ringing" ? "missed" : "ended",
          endedAt: new Date(),
        },
      });

      const otherId = call.callerId === req.user.id ? call.calleeId : call.callerId;
      wsHub.send(otherId, { type: "call:end", callId: call.id });

      return serializeCall(updated);
    }
  );
}
