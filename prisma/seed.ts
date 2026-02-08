import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";

const prisma = new PrismaClient();

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  return v;
}

function randomPassword(): string {
  return crypto.randomBytes(18).toString("base64url");
}

async function main() {
  const roles = [
    { code: "ROOT", nombre: "ROOT" },
    { code: "ADMIN", nombre: "ADMIN" },
    { code: "ALIADO", nombre: "ALIADO" },
    { code: "CLIENTE", nombre: "CLIENTE" },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: { nombre: role.nombre },
      create: role,
    });
  }

  const rootEmail = requireEnv("SEED_ROOT_EMAIL").toLowerCase().trim();
  const rootPassword = requireEnv("SEED_ROOT_PASSWORD");
  const rootNombre = process.env.SEED_ROOT_NOMBRE?.trim() || "ROOT";

  const rootHash = await bcrypt.hash(rootPassword, 12);

  const root = await prisma.user.upsert({
    where: { email: rootEmail },
    update: { nombre: rootNombre, passwordHash: rootHash },
    create: { email: rootEmail, nombre: rootNombre, passwordHash: rootHash },
  });

  const roleRoot = await prisma.role.findUniqueOrThrow({ where: { code: "ROOT" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: root.id, roleId: roleRoot.id } },
    update: {},
    create: { userId: root.id, roleId: roleRoot.id },
  });

  // Inventario interno: propiedades operadas por la empresa central.
  const internalEmail =
    process.env.SEED_INTERNAL_EMAIL?.toLowerCase().trim() ||
    "inventario@trends172tech.com";
  const internalPassword = process.env.SEED_INTERNAL_PASSWORD || randomPassword();
  const internalHash = await bcrypt.hash(internalPassword, 12);

  const internalUser = await prisma.user.upsert({
    where: { email: internalEmail },
    update: { passwordHash: internalHash, nombre: "Inventario interno" },
    create: {
      email: internalEmail,
      passwordHash: internalHash,
      nombre: "Inventario interno",
    },
  });

  const roleAliado = await prisma.role.findUniqueOrThrow({ where: { code: "ALIADO" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: internalUser.id, roleId: roleAliado.id } },
    update: {},
    create: { userId: internalUser.id, roleId: roleAliado.id },
  });

  await prisma.allyProfile.upsert({
    where: { userId: internalUser.id },
    update: { isInternal: true, status: "KYC_APPROVED" },
    create: { userId: internalUser.id, isInternal: true, status: "KYC_APPROVED" },
  });

  const settings = [
    { key: "platform_fee_rate", value: 0.12 },
    { key: "currency_default", value: "USD" },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value as Prisma.InputJsonValue },
      create: { key: s.key, value: s.value as Prisma.InputJsonValue },
    });
  }

  const amenities = [
    { slug: "wifi", nombre: "Wi‑Fi" },
    { slug: "aire-acondicionado", nombre: "Aire acondicionado" },
    { slug: "estacionamiento", nombre: "Estacionamiento" },
    { slug: "piscina", nombre: "Piscina" },
    { slug: "cocina", nombre: "Cocina" },
    { slug: "lavadora", nombre: "Lavadora" },
    { slug: "tv", nombre: "TV" },
    { slug: "agua-caliente", nombre: "Agua caliente" },
    { slug: "frente-a-la-playa", nombre: "Frente a la playa" },
    { slug: "planta-electrica", nombre: "Planta eléctrica" },
  ];

  for (const a of amenities) {
    await prisma.amenity.upsert({
      where: { slug: a.slug },
      update: { nombre: a.nombre },
      create: a,
    });
  }

  // Nota de seguridad: si no se definió SEED_INTERNAL_PASSWORD, se imprimirá aquí.
  if (!process.env.SEED_INTERNAL_PASSWORD) {
    console.log("[SEED] Contraseña generada para inventario interno:", internalPassword);
  }
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
