import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { PROPERTY_CONTRACT_TERMS_VERSION } from "@/lib/legal";

const schema = z.object({
  propertyId: z.string().min(1),
  acceptedTerms: z.literal(true),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const prop = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: {
      id: true,
      allyProfileId: true,
      status: true,
      ownershipContractUrl: true,
      ownershipContractPathname: true,
    },
  });
  if (!prop || prop.allyProfileId !== user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }
  if (prop.status === "PUBLISHED") {
    return NextResponse.json(
      { ok: false, message: "No puedes cambiar el contrato de una propiedad publicada." },
      { status: 400 },
    );
  }
  if (!prop.ownershipContractUrl || !prop.ownershipContractPathname) {
    return NextResponse.json(
      { ok: false, message: "Primero debes subir el contrato de propiedad." },
      { status: 400 },
    );
  }

  const updated = await prisma.property.update({
    where: { id: prop.id },
    data: {
      ownershipContractAcceptedAt: new Date(),
      ownershipContractTermsVersion: PROPERTY_CONTRACT_TERMS_VERSION,
    },
    select: { id: true, ownershipContractAcceptedAt: true, ownershipContractTermsVersion: true },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property_contract.accept_terms",
    entidadTipo: "property",
    entidadId: updated.id,
    metadata: {
      ownershipContractAcceptedAt: updated.ownershipContractAcceptedAt?.toISOString() || null,
      ownershipContractTermsVersion: updated.ownershipContractTermsVersion || null,
    },
  });

  return NextResponse.json({
    ok: true,
    propertyId: updated.id,
    ownershipContractAcceptedAt: updated.ownershipContractAcceptedAt?.toISOString() || null,
    ownershipContractTermsVersion: updated.ownershipContractTermsVersion || null,
  });
}

