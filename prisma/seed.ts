import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";
import {
  DEFAULT_TENANT_ID,
  DEFAULT_TENANT_LEGAL_NAME,
  DEFAULT_TENANT_NAME,
  DEFAULT_TENANT_SLUG,
} from "../src/lib/tenancy/constants";

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
  const defaultTenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_SLUG },
    update: {
      name: DEFAULT_TENANT_NAME,
      legalName: DEFAULT_TENANT_LEGAL_NAME,
      status: "ACTIVE",
      isDefault: true,
    },
    create: {
      id: DEFAULT_TENANT_ID,
      slug: DEFAULT_TENANT_SLUG,
      name: DEFAULT_TENANT_NAME,
      legalName: DEFAULT_TENANT_LEGAL_NAME,
      status: "ACTIVE",
      isDefault: true,
    },
  });

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

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: defaultTenant.id, userId: root.id } },
    update: { role: "OWNER", isActive: true },
    create: {
      tenantId: defaultTenant.id,
      userId: root.id,
      role: "OWNER",
      isActive: true,
    },
  });

  // Inventario interno: propiedades operadas por la empresa central.
  const internalEmail = (process.env.SEED_INTERNAL_EMAIL || "inventario@trends172tech.com").toLowerCase().trim();
  const internalPassword = process.env.SEED_INTERNAL_PASSWORD || randomPassword();
  const internalHash = await bcrypt.hash(internalPassword, 12);

  const internalUser = await prisma.user.upsert({
    where: { email: internalEmail },
    update: { passwordHash: internalHash, nombre: "Inventario interno" },
    create: { email: internalEmail, passwordHash: internalHash, nombre: "Inventario interno" },
  });

  const roleAliado = await prisma.role.findUniqueOrThrow({ where: { code: "ALIADO" } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: internalUser.id, roleId: roleAliado.id } },
    update: {},
    create: { userId: internalUser.id, roleId: roleAliado.id },
  });

  await prisma.tenantMembership.upsert({
    where: { tenantId_userId: { tenantId: defaultTenant.id, userId: internalUser.id } },
    update: { role: "MEMBER", isActive: true },
    create: {
      tenantId: defaultTenant.id,
      userId: internalUser.id,
      role: "MEMBER",
      isActive: true,
    },
  });

  const internalProfile = await prisma.allyProfile.upsert({
    where: { userId: internalUser.id },
    update: { tenantId: defaultTenant.id, isInternal: true, status: "KYC_APPROVED" },
    create: {
      tenantId: defaultTenant.id,
      userId: internalUser.id,
      isInternal: true,
      status: "KYC_APPROVED",
    },
  });

  // Billetera del aliado (contabilidad interna).
  await prisma.allyWallet.upsert({
    where: { allyProfileId: internalProfile.id },
    update: {},
    create: { allyProfileId: internalProfile.id },
  });

  const settings = [
    { key: "platform_fee_rate", value: 0.12 },
    { key: "currency_default", value: "USD" },
    {
      key: "site_branding",
      value: {
        brandName: "METRORA",
        agentName: "METRORA AI",
        logoUrl: "/metrora-mark.svg",
        logoPathname: null,
        colors: {
          primaryHsl: "221 83% 53%",
          secondaryHsl: "222 47% 16%",
        },
      },
    },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value as Prisma.InputJsonValue },
      create: { key: s.key, value: s.value as Prisma.InputJsonValue },
    });
  }

  const amenities = [
    { slug: "wifi", nombre: "Wi-Fi" },
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

  // Backfill: garantizar billetera para aliados existentes.
  const allyProfiles = await prisma.allyProfile.findMany({ select: { id: true } });
  for (const ap of allyProfiles) {
    await prisma.allyWallet.upsert({
      where: { allyProfileId: ap.id },
      update: {},
      create: { allyProfileId: ap.id },
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

