import { PrismaClient } from "@prisma/client";

export function startBackgroundJobs(prisma: PrismaClient) {
  // Story cleanup: delete expired stories every 5 minutes
  setInterval(async () => {
    try {
      await prisma.story.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    } catch {
      // non-fatal
    }
  }, 5 * 60 * 1000);

  // Scheduled post publisher: publish due posts every minute
  setInterval(async () => {
    try {
      const now = new Date();
      const due = await prisma.post.findMany({
        where: { status: "scheduled", scheduledAt: { lte: now }, deletedAt: null },
        select: { id: true },
      });
      for (const post of due) {
        await prisma.post.update({
          where: { id: post.id },
          data: { status: "published", scheduledAt: null },
        });
      }
    } catch {
      // non-fatal
    }
  }, 60 * 1000);
}
