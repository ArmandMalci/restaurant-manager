import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcrypt";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.staff.findUnique({
    where: { email: "admin@restaurant.local" },
  });
  if (existing) {
    console.log("Seed already applied — skipping");
    return;
  }

  const passwordHash = await bcrypt.hash("admin123", 12);
  await prisma.staff.create({
    data: {
      name: "Admin Manager",
      email: "admin@restaurant.local",
      passwordHash,
      role: "manager",
      active: true,
    },
  });
  console.log("Seeded initial manager: admin@restaurant.local / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
