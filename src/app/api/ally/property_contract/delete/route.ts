import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Datos invÃ¡lidos." }, { status: 400 });

  const prop = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { id: true, allyProfileId: true, status: true, ownershipContractPathname: true },
  });
  if (!prop || prop.allyProfileId !== user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (prop.status === "PUBLISHED") {
    return NextResponse.json({ ok: false, message: "No puedes cambiar el contrato de una propiedad publicada." }, { status: 400 });
  }

  const pathname = prop.ownershipContractPathname;

  await prisma.property.update({
    where: { id: prop.id },
    data: { ownershipContractUrl: null, ownershipContractPathname: null },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property_contract.delete",
    entidadTipo: "property",
    entidadId: prop.id,
    metadata: { pathname: pathname || null },
  });

  return NextResponse.json({ ok: true, pathname });
}

