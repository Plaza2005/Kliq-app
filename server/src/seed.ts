import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding KLIQ database...");

  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // Admin account only — real users register through the app
  await prisma.user.upsert({
    where: { email: "admin@kliq.app" },
    update: {},
    create: {
      email:       "admin@kliq.app",
      password:    await hash("Admin1234!"),
      username:    "admin",
      displayName: "KLIQ Admin",
      bio:         "Platform administrator",
      tier:        "pro",
      isVerified:  true,
      isAdmin:     true,
      status:      "active",
    },
  });

  console.log("\nSeed complete!");
  console.log("──────────────────────────────────");
  console.log("Admin login:  admin@kliq.app  /  Admin1234!");
  console.log("──────────────────────────────────\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
