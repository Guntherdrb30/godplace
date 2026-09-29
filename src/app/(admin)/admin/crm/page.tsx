import { revalidatePath } from "next/cache";
import type { DealStage, LeadPriority, LeadStage, OfferStatus, VisitStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function createLead(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const source = String(formData.get("source") || "").trim() || "manual";
  const propertyId = String(formData.get("propertyId") || "").trim() || null;
  const listingId = String(formData.get("listingId") || "").trim() || null;
  const assignedAgentProfileId = String(formData.get("assignedAgentProfileId") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  const priority = (String(formData.get("priority") || "MEDIUM") as LeadPriority);
  if (!name) throw new Error("Falta nombre del lead.");

  if (propertyId) {
    const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } });
    if (!property) throw new Error("Propiedad no encontrada.");
  }
  if (listingId) {
    const listing = await prisma.listing.findFirst({ where: { id: listingId, tenantId } });
    if (!listing) throw new Error("Publicación no encontrada.");
  }
  if (assignedAgentProfileId) {
    const agent = await prisma.agentProfile.findFirst({ where: { id: assignedAgentProfileId, tenantId, isActive: true } });
    if (!agent) throw new Error("Agente no válido.");
  }

  const lead = await prisma.lead.create({
    data: {
      tenantId,
      name,
      email,
      phone,
      source,
      propertyId,
      listingId,
      assignedAgentProfileId,
      notes,
      priority,
    },
  });

  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "lead.create",
    entidadTipo: "lead",
    entidadId: lead.id,
  });
  revalidatePath("/admin/crm");
}

async function updateLeadStage(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const id = String(formData.get("id") || "").trim();
  const stage = String(formData.get("stage") || "").trim() as LeadStage;
  const allowed: LeadStage[] = ["NEW","CONTACTED","QUALIFIED","VISIT_SCHEDULED","VISIT_COMPLETED","OFFER","NEGOTIATION","WON","LOST"];
  if (!allowed.includes(stage)) throw new Error("Etapa inválida.");
  const lead = await prisma.lead.findFirst({ where: { id, tenantId } });
  if (!lead) throw new Error("Lead no encontrado.");

  await prisma.lead.update({
    where: { id },
    data: {
      stage,
      lastContactAt: ["CONTACTED","QUALIFIED","VISIT_COMPLETED","OFFER","NEGOTIATION","WON","LOST"].includes(stage) ? new Date() : lead.lastContactAt,
    },
  });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "lead.stage",
    entidadTipo: "lead",
    entidadId: id,
    metadata: { from: lead.stage, to: stage },
  });
  revalidatePath("/admin/crm");
}

async function scheduleVisit(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const leadId = String(formData.get("leadId") || "").trim();
  const scheduledAtRaw = String(formData.get("scheduledAt") || "").trim();
  if (!leadId || !scheduledAtRaw) throw new Error("Faltan datos.");

  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: { listing: true },
  });
  if (!lead) throw new Error("Lead no encontrado.");
  const propertyId = lead.propertyId || lead.listing?.propertyId;
  if (!propertyId) throw new Error("El lead no tiene propiedad asociada.");

  const visit = await prisma.visit.create({
    data: {
      tenantId,
      leadId,
      propertyId,
      agentProfileId: lead.assignedAgentProfileId,
      scheduledAt: new Date(scheduledAtRaw),
    },
  });
  await prisma.lead.update({ where: { id: leadId }, data: { stage: "VISIT_SCHEDULED" } });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "visit.create",
    entidadTipo: "visit",
    entidadId: visit.id,
    metadata: { leadId, propertyId },
  });
  revalidatePath("/admin/crm");
}

async function updateVisitStatus(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim() as VisitStatus;
  const visit = await prisma.visit.findFirst({ where: { id, tenantId } });
  if (!visit) throw new Error("Visita no encontrada.");
  await prisma.visit.update({ where: { id }, data: { status } });
  if (status === "COMPLETED") {
    await prisma.lead.update({ where: { id: visit.leadId }, data: { stage: "VISIT_COMPLETED", lastContactAt: new Date() } });
  }
  await registrarAuditoria({ tenantId, actorUserId: actor.id, accion: "visit.status", entidadTipo: "visit", entidadId: id, metadata: { status } });
  revalidatePath("/admin/crm");
}

async function openDeal(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const leadId = String(formData.get("leadId") || "").trim();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, tenantId },
    include: { listing: true, property: true },
  });
  if (!lead) throw new Error("Lead no encontrado.");
  const propertyId = lead.propertyId || lead.listing?.propertyId;
  if (!propertyId) throw new Error("El lead no tiene propiedad asociada.");

  const deal = await prisma.deal.create({
    data: {
      tenantId,
      leadId,
      propertyId,
      listingId: lead.listingId,
      agentProfileId: lead.assignedAgentProfileId,
      stage: "OPEN",
    },
  });
  await registrarAuditoria({ tenantId, actorUserId: actor.id, accion: "deal.create", entidadTipo: "deal", entidadId: deal.id, metadata: { leadId } });
  revalidatePath("/admin/crm");
}

async function createOffer(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const dealId = String(formData.get("dealId") || "").trim();
  const amountCents = Number.parseInt(String(formData.get("amountCents") || "0"), 10) || 0;
  const terms = String(formData.get("terms") || "").trim() || null;
  if (!dealId || amountCents <= 0) throw new Error("Oferta inválida.");
  const deal = await prisma.deal.findFirst({ where: { id: dealId, tenantId } });
  if (!deal) throw new Error("Operación no encontrada.");

  const offer = await prisma.offer.create({
    data: { tenantId, dealId, amountCents, currency: deal.currency, status: "SENT", terms },
  });
  await prisma.deal.update({ where: { id: dealId }, data: { stage: "OFFER", expectedAmountCents: amountCents } });
  if (deal.leadId) await prisma.lead.update({ where: { id: deal.leadId }, data: { stage: "OFFER" } });
  await registrarAuditoria({ tenantId, actorUserId: actor.id, accion: "offer.create", entidadTipo: "offer", entidadId: offer.id, metadata: { dealId, amountCents } });
  revalidatePath("/admin/crm");
}

async function updateOfferStatus(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim() as OfferStatus;
  const offer = await prisma.offer.findFirst({ where: { id, tenantId }, include: { deal: true } });
  if (!offer) throw new Error("Oferta no encontrada.");

  await prisma.offer.update({ where: { id }, data: { status } });
  const dealStage: DealStage | null = status === "ACCEPTED" ? "WON" : status === "REJECTED" ? "NEGOTIATION" : null;
  if (dealStage) {
    await prisma.deal.update({
      where: { id: offer.dealId },
      data: { stage: dealStage, closedAt: dealStage === "WON" ? new Date() : null },
    });
    if (offer.deal.leadId) {
      await prisma.lead.update({
        where: { id: offer.deal.leadId },
        data: { stage: dealStage === "WON" ? "WON" : "NEGOTIATION" },
      });
    }
  }
  await registrarAuditoria({ tenantId, actorUserId: actor.id, accion: "offer.status", entidadTipo: "offer", entidadId: id, metadata: { status } });
  revalidatePath("/admin/crm");
}

const stageLabels: Record<LeadStage,string> = {
  NEW:"Nuevo", CONTACTED:"Contactado", QUALIFIED:"Calificado", VISIT_SCHEDULED:"Visita programada",
  VISIT_COMPLETED:"Visita realizada", OFFER:"Oferta", NEGOTIATION:"Negociación", WON:"Ganado", LOST:"Perdido",
};

export default async function CrmPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const [properties, listings, agents, leads, visits, deals] = await Promise.all([
    prisma.property.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.listing.findMany({ where: { tenantId }, include: { property: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.agentProfile.findMany({ where: { tenantId, isActive: true }, include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.lead.findMany({
      where: { tenantId },
      include: { property: true, listing: true, assignedAgent: { include: { user: true } }, _count: { select: { visits: true, deals: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.visit.findMany({ where: { tenantId }, include: { lead: true, property: true }, orderBy: { scheduledAt: "asc" }, take: 100 }),
    prisma.deal.findMany({ where: { tenantId }, include: { lead: true, property: true, offers: { orderBy: { createdAt: "desc" } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
  ]);

  const stages: LeadStage[] = ["NEW","CONTACTED","QUALIFIED","VISIT_SCHEDULED","VISIT_COMPLETED","OFFER","NEGOTIATION","WON","LOST"];

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">CRM inmobiliario</h1>
      <p className="mt-2 text-sm text-muted-foreground">Leads, seguimiento, visitas, oportunidades y ofertas de la inmobiliaria activa.</p>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.8fr_1.7fr]">
        <Card>
          <CardHeader><CardTitle>Nuevo lead</CardTitle></CardHeader>
          <CardContent>
            <form action={createLead} className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="name">Nombre</Label><Input id="name" name="name" required /></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
                <div className="grid gap-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" /></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="source">Origen</Label><Input id="source" name="source" placeholder="Marketplace, WhatsApp, Instagram..." /></div>
              <div className="grid gap-2">
                <Label htmlFor="listingId">Publicación</Label>
                <select id="listingId" name="listingId" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Sin publicación</option>
                  {listings.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="propertyId">Propiedad directa</Label>
                <select id="propertyId" name="propertyId" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Sin propiedad</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="assignedAgentProfileId">Agente</Label>
                <select id="assignedAgentProfileId" name="assignedAgentProfileId" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Sin asignar</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.displayName || a.user.nombre || a.user.email}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="priority">Prioridad</Label>
                <select id="priority" name="priority" defaultValue="MEDIUM" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="LOW">Baja</option><option value="MEDIUM">Media</option><option value="HIGH">Alta</option><option value="URGENT">Urgente</option>
                </select>
              </div>
              <div className="grid gap-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" name="notes" rows={4}/></div>
              <Button type="submit" variant="brand">Crear lead</Button>
            </form>
          </CardContent>
        </Card>

        <div className="min-w-0 overflow-x-auto">
          <div className="grid min-w-[1500px] grid-cols-9 gap-3">
            {stages.map((stage) => {
              const items = leads.filter((l) => l.stage === stage);
              return (
                <div key={stage} className="rounded-2xl border bg-white/70 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="text-xs font-semibold uppercase tracking-wide">{stageLabels[stage]}</div>
                    <div className="rounded-full bg-secondary px-2 py-0.5 text-xs">{items.length}</div>
                  </div>
                  <div className="space-y-3">
                    {items.map((lead) => (
                      <div key={lead.id} className="rounded-xl border bg-white p-3 shadow-sm">
                        <div className="text-sm font-medium">{lead.name}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{lead.phone || lead.email || "Sin contacto"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{lead.listing?.title || lead.property?.titulo || "Sin propiedad"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">Prioridad: {lead.priority}</div>
                        <div className="mt-3 space-y-2">
                          <form action={updateLeadStage}>
                            <input type="hidden" name="id" value={lead.id}/>
                            <select name="stage" defaultValue={lead.stage} className="h-8 w-full rounded-md border bg-white px-2 text-xs">
                              {stages.map((s) => <option key={s} value={s}>{stageLabels[s]}</option>)}
                            </select>
                            <Button type="submit" size="sm" variant="outline" className="mt-2 w-full">Mover</Button>
                          </form>
                          {(lead.propertyId || lead.listingId) ? (
                            <form action={scheduleVisit} className="space-y-2">
                              <input type="hidden" name="leadId" value={lead.id}/>
                              <Input name="scheduledAt" type="datetime-local" required className="h-8 text-xs"/>
                              <Button type="submit" size="sm" variant="outline" className="w-full">Agendar visita</Button>
                            </form>
                          ) : null}
                          {(lead.propertyId || lead.listingId) && lead._count.deals === 0 ? (
                            <form action={openDeal}>
                              <input type="hidden" name="leadId" value={lead.id}/>
                              <Button type="submit" size="sm" variant="brand" className="w-full">Abrir operación</Button>
                            </form>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Visitas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {visits.length === 0 ? <p className="text-sm text-muted-foreground">No hay visitas programadas.</p> : visits.map((visit) => (
              <div key={visit.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{visit.lead.name} · {visit.property.titulo}</div>
                <div className="mt-1 text-sm text-muted-foreground">{visit.scheduledAt.toLocaleString("es-VE")} · {visit.status}</div>
                {visit.status === "SCHEDULED" ? (
                  <div className="mt-3 flex gap-2">
                    <form action={updateVisitStatus}><input type="hidden" name="id" value={visit.id}/><input type="hidden" name="status" value="COMPLETED"/><Button size="sm" variant="brand">Realizada</Button></form>
                    <form action={updateVisitStatus}><input type="hidden" name="id" value={visit.id}/><input type="hidden" name="status" value="CANCELLED"/><Button size="sm" variant="outline">Cancelar</Button></form>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operaciones y ofertas</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {deals.length === 0 ? <p className="text-sm text-muted-foreground">No hay operaciones abiertas.</p> : deals.map((deal) => (
              <div key={deal.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{deal.lead?.name || "Operación"} · {deal.property.titulo}</div>
                <div className="mt-1 text-sm text-muted-foreground">Etapa: {deal.stage}</div>
                {deal.stage !== "WON" && deal.stage !== "LOST" ? (
                  <form action={createOffer} className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto]">
                    <input type="hidden" name="dealId" value={deal.id}/>
                    <Input name="amountCents" type="number" min={1} placeholder="Monto centavos" required/>
                    <Input name="terms" placeholder="Condiciones"/>
                    <Button type="submit" variant="brand">Enviar oferta</Button>
                  </form>
                ) : null}
                {deal.offers.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    {deal.offers.map((offer) => (
                      <div key={offer.id} className="rounded-lg bg-secondary/40 p-3 text-xs">
                        <div>{offer.currency} {(offer.amountCents / 100).toLocaleString("es-VE")} · {offer.status}</div>
                        {offer.status === "SENT" ? (
                          <div className="mt-2 flex gap-2">
                            <form action={updateOfferStatus}><input type="hidden" name="id" value={offer.id}/><input type="hidden" name="status" value="ACCEPTED"/><Button size="sm" variant="brand">Aceptar</Button></form>
                            <form action={updateOfferStatus}><input type="hidden" name="id" value={offer.id}/><input type="hidden" name="status" value="REJECTED"/><Button size="sm" variant="outline">Rechazar</Button></form>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
