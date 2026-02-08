import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().min(1),
  url: z.string().url(),
  pathname: z.string().min(1),
  alt: z.string().max(160).optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  const isAliado = !!user && user.roles.includes("ALIADO") && !!user.allyProfileId;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });

  if (!isStaff) {
    if (!isAliado) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }
    const prop = await prisma.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: { allyProfileId: true },
    });
    if (!prop || prop.allyProfileId !== user.allyProfileId) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }
  }

  const ordenActual = await prisma.propertyImage.count({
    where: { propertyId: parsed.data.propertyId },
  });

  const img = await prisma.propertyImage.create({
    data: {
      propertyId: parsed.data.propertyId,
      url: parsed.data.url,
      pathname: parsed.data.pathname,
      alt: parsed.data.alt,
      orden: ordenActual,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "property_image.create",
    entidadTipo: "property_image",
    entidadId: img.id,
    metadata: { propertyId: parsed.data.propertyId },
  });

  return NextResponse.json({ ok: true, imageId: img.id });
}
