import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  titulo: z.string().trim().min(1),
  descripcion: z.string().trim().min(1),
  ciudad: z.string().trim().min(1),
  estadoRegion: z.string().trim().min(1),
  direccion: z.string().trim().optional(),
  urbanizacion: z.string().trim().optional(),
  calle: z.string().trim().optional(),
  avenida: z.string().trim().optional(),
  nivelPlanta: z.string().trim().optional(),
  pricePerNightCents: z.number().int().positive(),
  huespedesMax: z.number().int().min(1),
  habitaciones: z.number().int().min(1),
  camas: z.number().int().min(1),
  banos: z.number().int().min(1),
});

function nullable(v?: string) {
  const t = (v || "").trim();
  return t ? t : null;
}

async function ensureInternalAllyProfileId() {
  const existing = await prisma.allyProfile.findFirst({
    where: { isInternal: true },
    select: { id: true },
  });
  if (existing) return existing.id;

  const email = (process.env.SEED_INTERNAL_EMAIL || "inventario@trends172tech.com").toLowerCase().trim();
  const rawPassword = crypto.randomBytes(18).toString("base64url");
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  const aliadoRole = await prisma.role.upsert({
    where: { code: "ALIADO" },
    update: { nombre: "ALIADO" },
    create: { code: "ALIADO", nombre: "ALIADO" },
    select: { id: true },
  });

  const internalUser = await prisma.user.upsert({
    where: { email },
    update: { nombre: "Inventario interno", passwordHash, status: "ACTIVE" },
    create: { email, nombre: "Inventario interno", passwordHash, status: "ACTIVE" },
    select: { id: true },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: internalUser.id, roleId: aliadoRole.id } },
    update: {},
    create: { userId: internalUser.id, roleId: aliadoRole.id },
  });

  const internalProfile = await prisma.allyProfile.upsert({
    where: { userId: internalUser.id },
    update: { isInternal: true, status: "KYC_APPROVED" },
    create: { userId: internalUser.id, isInternal: true, status: "KYC_APPROVED" },
    select: { id: true },
  });

  await prisma.allyWallet.upsert({
    where: { allyProfileId: internalProfile.id },
    update: {},
    create: { allyProfileId: internalProfile.id },
  });

  return internalProfile.id;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos invalidos." }, { status: 400 });
  }

  const internalAllyProfileId = await ensureInternalAllyProfileId();

  const input = parsed.data;
  const property = await prisma.property.create({
    data: {
      allyProfileId: internalAllyProfileId,
      titulo: input.titulo,
      descripcion: input.descripcion,
      ciudad: input.ciudad,
      estadoRegion: input.estadoRegion,
      direccion: nullable(input.direccion),
      urbanizacion: nullable(input.urbanizacion),
      calle: nullable(input.calle),
      avenida: nullable(input.avenida),
      nivelPlanta: nullable(input.nivelPlanta),
      huespedesMax: input.huespedesMax,
      habitaciones: input.habitaciones,
      camas: input.camas,
      banos: input.banos,
      pricePerNightCents: input.pricePerNightCents,
      currency: "USD",
      status: "DRAFT",
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "property.create",
    entidadTipo: "property",
    entidadId: property.id,
    metadata: { via: "api.admin.properties.create" },
  });

  return NextResponse.json({ ok: true, propertyId: property.id });
}
