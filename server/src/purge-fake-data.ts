import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const FAKE_EMAILS = [
  "alex@kliq.app",
  "mia@kliq.app",
  "dj@kliq.app",
  "kai@kliq.app",
  "sarah@kliq.app",
  "fit@kliq.app",
];

async function main() {
  console.log("Purging fake seeded data...");

  const deleted = await prisma.user.deleteMany({
    where: { email: { in: FAKE_EMAILS } },
  });

  console.log(`Deleted ${deleted.count} fake users (and their posts, notifications, follows via cascade).`);
  console.log("Done. Only admin and real users remain.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
