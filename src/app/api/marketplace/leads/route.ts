import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";

const schema = z
  .object({
    propertyId: z.string().min(1),
    listingId: z.string().min(1).optional().nullable(),
    name: z.string().trim().min(2).max(120),
    email: z.string().trim().email().max(160).optional().or(z.literal("")),
    phone: z.string().trim().max(40).optional().or(z.literal("")),
    message: z.string().trim().max(1500).optional().or(z.literal("")),
    companyWebsite: z.string().max(200).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.email || data.phone), {
    message: "Indica un correo o telefono.",
    path: ["email"],
  });

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, message: parsed.error.issues[0]?.message || "Datos invalidos." },
      { status: 400 },
    );
  }

  // Honeypot: bots suelen completar campos invisibles. Respondemos OK sin persistir.
  if (parsed.data.companyWebsite) {
    return NextResponse.json({ ok: true });
  }

  const property = await prisma.property.findFirst({
    where: {
      id: parsed.data.propertyId,
      status: "PUBLISHED",
      tenant: { status: "ACTIVE" },
    },
    select: {
      id: true,
      tenantId: true,
      assignedAgentProfileId: true,
    },
  });
  if (!property) {
    return NextResponse.json({ ok: false, message: "Propiedad no encontrada." }, { status: 404 });
  }

  const listing = parsed.data.listingId
    ? await prisma.listing.findFirst({
        where: {
          id: parsed.data.listingId,
          tenantId: property.tenantId,
          propertyId: property.id,
          status: "PUBLISHED",
        },
        select: { id: true, assignedAgentProfileId: true },
      })
    : await prisma.listing.findFirst({
        where: {
          tenantId: property.tenantId,
          propertyId: property.id,
          status: "PUBLISHED",
        },
        select: { id: true, assignedAgentProfileId: true },
        orderBy: { updatedAt: "desc" },
      });

  if (parsed.data.listingId && !listing) {
    return NextResponse.json({ ok: false, message: "Publicacion no encontrada." }, { status: 404 });
  }

  let assignedAgentProfileId =
    listing?.assignedAgentProfileId || property.assignedAgentProfileId || null;

  if (!assignedAgentProfileId) {
    const fallbackAgent = await prisma.agentProfile.findFirst({
      where: { tenantId: property.tenantId, isActive: true },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    assignedAgentProfileId = fallbackAgent?.id ?? null;
  }

  const email = parsed.data.email || null;
  const phone = parsed.data.phone || null;
  const recentSince = new Date(Date.now() - 15 * 60 * 1000);
  const contactFilters = [
    ...(email ? [{ email }] : []),
    ...(phone ? [{ phone }] : []),
  ];

  const recentLead =
    contactFilters.length > 0
      ? await prisma.lead.findFirst({
          where: {
            tenantId: property.tenantId,
            propertyId: property.id,
            source: "MARKETPLACE",
            createdAt: { gte: recentSince },
            OR: contactFilters,
          },
          select: { id: true },
          orderBy: { createdAt: "desc" },
        })
      : null;

  if (recentLead) {
    await registrarAuditoria({
      tenantId: property.tenantId,
      accion: "marketplace.lead_duplicate_suppressed",
      entidadTipo: "lead",
      entidadId: recentLead.id,
      metadata: { propertyId: property.id, listingId: listing?.id ?? null },
    });
    return NextResponse.json({ ok: true, leadId: recentLead.id, existing: true });
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId: property.tenantId,
      listingId: listing?.id ?? null,
      propertyId: property.id,
      assignedAgentProfileId,
      name: parsed.data.name,
      email,
      phone,
      source: "MARKETPLACE",
      priority: "MEDIUM",
      stage: "NEW",
      notes: parsed.data.message || null,
    },
  });

  await registrarAuditoria({
    tenantId: property.tenantId,
    accion: "marketplace.lead_create",
    entidadTipo: "lead",
    entidadId: lead.id,
    metadata: {
      propertyId: property.id,
      listingId: listing?.id ?? null,
      assignedAgentProfileId,
    },
  });

  return NextResponse.json({ ok: true, leadId: lead.id });
}
