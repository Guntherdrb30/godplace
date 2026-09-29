import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { PROPERTY_CONTRACT_TERMS_VERSION } from "@/lib/legal";

const schema = z.object({
  propertyId: z.string().min(1),
  url: z.string().url(),
  pathname: z.string().min(1),
  acceptedTerms: z.boolean(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId || !user.tenantId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  if (!parsed.data.acceptedTerms) {
    return NextResponse.json(
      { ok: false, message: "Debes aceptar los términos y condiciones para subir el contrato." },
      { status: 400 },
    );
  }

  const prop = await prisma.property.findFirst({
    where: { id: parsed.data.propertyId, tenantId: user.tenantId },
    select: { id: true, allyProfileId: true, status: true, ownershipContractPathname: true },
  });
  if (!prop || prop.allyProfileId !== user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (prop.status === "PUBLISHED") {
    return NextResponse.json({ ok: false, message: "No puedes cambiar el contrato de una propiedad publicada." }, { status: 400 });
  }

  const updated = await prisma.property.update({
    where: { id: prop.id },
    data: {
      ownershipContractUrl: parsed.data.url,
      ownershipContractPathname: parsed.data.pathname,
      ownershipContractAcceptedAt: new Date(),
      ownershipContractTermsVersion: PROPERTY_CONTRACT_TERMS_VERSION,
    },
    select: { id: true, ownershipContractPathname: true, ownershipContractAcceptedAt: true, ownershipContractTermsVersion: true },
  });

  await registrarAuditoria({
    tenantId: user.tenantId,
    actorUserId: user.id,
    accion: "ally_property_contract.upsert",
    entidadTipo: "property",
    entidadId: updated.id,
    metadata: {
      prevPathname: prop.ownershipContractPathname || null,
      ownershipContractAcceptedAt: updated.ownershipContractAcceptedAt?.toISOString() || null,
      ownershipContractTermsVersion: updated.ownershipContractTermsVersion || null,
    },
  });

  return NextResponse.json({
    ok: true,
    propertyId: updated.id,
    prevPathname: prop.ownershipContractPathname || null,
    ownershipContractAcceptedAt: updated.ownershipContractAcceptedAt?.toISOString() || null,
    ownershipContractTermsVersion: updated.ownershipContractTermsVersion || null,
  });
}
