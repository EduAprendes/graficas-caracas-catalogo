import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import bcrypt from "bcryptjs";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  const [, , username, password, ...nameParts] = process.argv;
  const name = nameParts.join(" ") || username;

  if (!username || !password) {
    console.error("Uso: npx tsx prisma/create-user.ts <usuario> <contraseña> [nombre]");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, name },
    create: { username, passwordHash, name },
  });

  console.log(`Usuario listo: ${user.username} (${user.name})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
