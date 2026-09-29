import { revalidatePath } from "next/cache";
import type { ListingOperationType, ListingStatus } from "@prisma/client";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function createListing(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const propertyId = String(formData.get("propertyId") || "").trim();
  const operationType = String(formData.get("operationType") || "").trim() as ListingOperationType;
  const title = String(formData.get("title") || "").trim();
  const priceCents = Number.parseInt(String(formData.get("priceCents") || "0"), 10) || 0;
  if (!propertyId || !title || priceCents <= 0) throw new Error("Datos inválidos.");

  const property = await prisma.property.findFirst({ where: { id: propertyId, tenantId } });
  if (!property) throw new Error("Propiedad no encontrada.");

  const listing = await prisma.listing.upsert({
    where: { propertyId_operationType: { propertyId, operationType } },
    update: { title, priceCents, currency: property.currency },
    create: { tenantId, propertyId, operationType, title, priceCents, currency: property.currency },
  });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "listing.upsert",
    entidadTipo: "listing",
    entidadId: listing.id,
  });
  revalidatePath("/admin/publicaciones");
}

async function setStatus(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim() as ListingStatus;
  const listing = await prisma.listing.findFirst({ where: { id, tenantId } });
  if (!listing) throw new Error("Publicación no encontrada.");
  await prisma.listing.update({
    where: { id },
    data: { status, publishedAt: status === "PUBLISHED" ? new Date() : listing.publishedAt },
  });
  await registrarAuditoria({ tenantId, actorUserId: actor.id, accion: "listing.status", entidadTipo: "listing", entidadId: id, metadata: { status } });
  revalidatePath("/admin/publicaciones");
}

export default async function ListingsPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const [properties, listings] = await Promise.all([
    prisma.property.findMany({ where: { tenantId }, orderBy: { updatedAt: "desc" }, take: 200 }),
    prisma.listing.findMany({ where: { tenantId }, include: { property: true }, orderBy: { updatedAt: "desc" }, take: 200 }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Publicaciones</h1>
      <p className="mt-2 text-sm text-muted-foreground">Separa el activo inmobiliario de la oferta comercial publicada.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Nueva publicación</CardTitle></CardHeader>
          <CardContent>
            <form action={createListing} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="propertyId">Propiedad</Label>
                <select id="propertyId" name="propertyId" required className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Seleccionar</option>
                  {properties.map((p) => <option key={p.id} value={p.id}>{p.titulo}</option>)}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="operationType">Operación</Label>
                <select id="operationType" name="operationType" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="SALE">Venta</option>
                  <option value="SHORT_RENT">Alquiler temporal</option>
                  <option value="LONG_RENT">Alquiler residencial</option>
                  <option value="COMMERCIAL_RENT">Alquiler comercial</option>
                </select>
              </div>
              <div className="grid gap-2"><Label htmlFor="title">Título</Label><Input id="title" name="title" required /></div>
              <div className="grid gap-2"><Label htmlFor="priceCents">Precio (centavos)</Label><Input id="priceCents" name="priceCents" type="number" min={1} required /></div>
              <Button type="submit" variant="brand">Crear publicación</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Publicaciones del tenant</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {listings.length === 0 ? <p className="text-sm text-muted-foreground">No hay publicaciones.</p> : listings.map((listing) => (
              <div key={listing.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{listing.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{listing.property.titulo} · {listing.operationType} · {listing.status}</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {listing.status !== "PUBLISHED" ? <form action={setStatus}><input type="hidden" name="id" value={listing.id}/><input type="hidden" name="status" value="PUBLISHED"/><Button size="sm" variant="brand">Publicar</Button></form> : null}
                  {listing.status === "PUBLISHED" ? <form action={setStatus}><input type="hidden" name="id" value={listing.id}/><input type="hidden" name="status" value="PAUSED"/><Button size="sm" variant="outline">Pausar</Button></form> : null}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
