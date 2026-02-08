import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  imageId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  const isAliado = !!user && user.roles.includes("ALIADO") && !!user.allyProfileId;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });

  const img = await prisma.propertyImage.findUnique({ where: { id: parsed.data.imageId } });
  if (!img) return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });

  if (!isStaff) {
    if (!isAliado) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    const prop = await prisma.property.findUnique({
      where: { id: img.propertyId },
      select: { allyProfileId: true },
    });
    if (!prop || prop.allyProfileId !== user.allyProfileId) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }
  }

  await prisma.propertyImage.delete({ where: { id: img.id } });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "property_image.delete",
    entidadTipo: "property_image",
    entidadId: img.id,
    metadata: { propertyId: img.propertyId, pathname: img.pathname },
  });

  return NextResponse.json({ ok: true, pathname: img.pathname });
}
