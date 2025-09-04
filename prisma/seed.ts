// prisma/seed.ts
import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Change these before deploying!
  const adminEmail = "admin@gmail.com";
  const adminPasswordPlain = "pass";

  const userEmail = "user@gmail.com";
  const userPasswordPlain = "pass";

  const [adminHash, userHash] = await Promise.all([
    bcrypt.hash(adminPasswordPlain, 10),
    bcrypt.hash(userPasswordPlain, 10),
  ]);

  // ADMIN
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      // keep existing name/role if you prefer; updating role keeps it ADMIN
      role: Role.ADMIN,
    },
    create: {
      name: "Platform Admin",
      email: adminEmail,
      password: adminHash,
      role: Role.ADMIN,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  // Regular USER
  const user = await prisma.user.upsert({
    where: { email: userEmail },
    update: {
      role: Role.USER,
    },
    create: {
      name: "Sample User",
      email: userEmail,
      password: userHash,
      role: Role.USER,
    },
    select: { id: true, email: true, role: true, createdAt: true },
  });

  console.log("✅ Seed complete:");
  console.log("  Admin:", admin.email, "(password:", adminPasswordPlain + ")");
  console.log("  User :", user.email, "(password:", userPasswordPlain + ")");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (err) => {
    console.error("Seed error:", err);
    await prisma.$disconnect();
    process.exit(1);
  });
