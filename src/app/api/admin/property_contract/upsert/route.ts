import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  propertyId: z.string().min(1),
  url: z.string().url(),
  pathname: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });

  const prop = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: { id: true, ownershipContractPathname: true },
  });
  if (!prop) return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });

  await prisma.property.update({
    where: { id: prop.id },
    data: {
      ownershipContractUrl: parsed.data.url,
      ownershipContractPathname: parsed.data.pathname,
      ownershipContractAcceptedAt: null,
      ownershipContractTermsVersion: null,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "admin_property_contract.upsert",
    entidadTipo: "property",
    entidadId: prop.id,
    metadata: { prevPathname: prop.ownershipContractPathname || null },
  });

  return NextResponse.json({ ok: true, prevPathname: prop.ownershipContractPathname || null });
}
