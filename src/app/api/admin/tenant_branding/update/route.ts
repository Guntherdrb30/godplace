import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const hsl = z
  .string()
  .trim()
  .regex(/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/, "Formato HSL inválido.")
  .refine((value) => {
    const [hRaw, sRaw, lRaw] = value.split(/\s+/);
    const h = Number(hRaw);
    const s = Number(sRaw.replace("%", ""));
    const l = Number(lRaw.replace("%", ""));
    return h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100;
  }, "Valores HSL fuera de rango.");

const optionalUrl = z.union([z.string().trim().url().max(2048), z.literal("")]).optional();

const schema = z.object({
  name: z.string().trim().min(1).max(120),
  legalName: z.string().trim().max(160).optional().or(z.literal("")),
  logoUrl: optionalUrl,
  logoPathname: z.string().trim().max(2048).optional().or(z.literal("")),
  primaryHsl: hsl.optional().or(z.literal("")),
  secondaryHsl: hsl.optional().or(z.literal("")),
  contactEmail: z.union([z.string().trim().email().max(160), z.literal("")]).optional(),
  contactPhone: z.string().trim().max(50).optional(),
  contactWhatsapp: z.string().trim().max(50).optional(),
  websiteUrl: optionalUrl,
});

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  if (!actor || (!actor.roles.includes("ADMIN") && !actor.roles.includes("ROOT")) || !actor.tenantId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message || "Datos inválidos." },
      { status: 400 },
    );
  }

  const tenant = await prisma.tenant.findFirst({
    where: {
      id: actor.tenantId,
      memberships: { some: { userId: actor.id, isActive: true } },
    },
  });
  if (!tenant) {
    return NextResponse.json({ ok: false, message: "Tenant no encontrado." }, { status: 404 });
  }

  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name: parsed.data.name,
      legalName: parsed.data.legalName || null,
      logoUrl: parsed.data.logoUrl || null,
      logoPathname: parsed.data.logoPathname || null,
      primaryHsl: parsed.data.primaryHsl || null,
      secondaryHsl: parsed.data.secondaryHsl || null,
      contactEmail: parsed.data.contactEmail || null,
      contactPhone: parsed.data.contactPhone || null,
      contactWhatsapp: parsed.data.contactWhatsapp || null,
      websiteUrl: parsed.data.websiteUrl || null,
    },
  });

  await registrarAuditoria({
    tenantId: tenant.id,
    actorUserId: actor.id,
    accion: "tenant.branding.update",
    entidadTipo: "tenant",
    entidadId: tenant.id,
    metadata: {
      name: updated.name,
      hasLogo: Boolean(updated.logoUrl),
      primaryHsl: updated.primaryHsl,
      secondaryHsl: updated.secondaryHsl,
    },
  });

  return NextResponse.json({ ok: true });
}
