import { PrismaClient } from "@prisma/client";
import { clearDemoData } from "./demo-data";

const prisma = new PrismaClient();

async function main() {
  console.log("Purging fake/demo seeded data...");
  const summary = await clearDemoData(prisma);
  console.log("Deleted:", summary);
  console.log("Done. Only admin and real users remain.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
