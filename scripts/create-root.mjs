import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

async function main() {
  // Safety latch: avoid accidental runs against production.
  // Usage: set CONFIRM_CREATE_ROOT=1 explicitly.
  if (process.env.CONFIRM_CREATE_ROOT !== "1") {
    throw new Error(
      "Refusing to run without CONFIRM_CREATE_ROOT=1. This script upserts a ROOT user in the current DATABASE_URL.",
    );
  }

  const email = requireEnv("ROOT_EMAIL").toLowerCase().trim();
  const password = requireEnv("ROOT_PASSWORD");
  const nombre = (process.env.ROOT_NOMBRE || "ROOT").trim();

  if (!email.includes("@")) throw new Error("ROOT_EMAIL must be a valid email.");
  if (password.length < 12) throw new Error("ROOT_PASSWORD must be at least 12 characters.");

  // Ensure critical roles exist (seed may not run in some environments).
  const roles = [
    { code: "ROOT", nombre: "ROOT" },
    { code: "ADMIN", nombre: "ADMIN" },
  ];
  for (const r of roles) {
    await prisma.role.upsert({
      where: { code: r.code },
      update: { nombre: r.nombre },
      create: { code: r.code, nombre: r.nombre },
    });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { email },
    update: { nombre, passwordHash, status: "ACTIVE" },
    create: { email, nombre, passwordHash, status: "ACTIVE" },
    select: { id: true, email: true },
  });

  const roleRoot = await prisma.role.findUniqueOrThrow({
    where: { code: "ROOT" },
    select: { id: true },
  });

  // Make sure the user has ROOT (idempotent).
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleRoot.id } },
    update: {},
    create: { userId: user.id, roleId: roleRoot.id },
  });

  console.log(`[create-root] OK: ${user.email}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

