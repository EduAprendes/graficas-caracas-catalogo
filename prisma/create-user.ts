import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const args = process.argv.slice(2);
  const roleArg = args.find((a) => a.startsWith("--rol="));
  const [username, password, ...nameParts] = args.filter((a) => !a.startsWith("--rol="));
  const name = nameParts.join(" ") || username;
  const role = roleArg ? roleArg.slice(6).toUpperCase() : null;
  if (role && !["ADMIN", "ADMINISTRADORA"].includes(role)) {
    console.error("--rol debe ser ADMIN o ADMINISTRADORA");
    process.exit(1);
  }

  if (!username || !password) {
    console.error("Uso: npx tsx prisma/create-user.ts <usuario> <contraseña> [nombre] [--rol=administradora]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, name, ...(role ? { role } : {}) },
    create: { username, passwordHash, name, role: role ?? "ADMIN" },
  });

  console.log(`Usuario listo: ${user.username} (${user.name}) rol ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
