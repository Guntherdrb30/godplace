import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import type { PropertyStatus } from "@prisma/client";
import { labelPropertyStatus } from "@/lib/labels";
import { sendEmail } from "@/lib/email";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Propiedades", path: "/admin/propiedades" });

async function crearPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const estadoRegion = String(formData.get("estadoRegion") || "").trim();
  const price = Number.parseInt(String(formData.get("pricePerNightCents") || "0"), 10) || 0;
  const maxGuests = Number.parseInt(String(formData.get("huespedesMax") || "1"), 10) || 1;

  if (!titulo || !descripcion || !ciudad || !estadoRegion) {
    throw new Error("Faltan campos obligatorios.");
  }
  if (price <= 0) throw new Error("El precio por noche debe ser mayor a 0 (en centavos).");

  const internal = await prisma.allyProfile.findFirst({
    where: { isInternal: true },
    select: { id: true },
  });
  if (!internal) throw new Error("Falta AllyProfile interno (seed).");

  const p = await prisma.property.create({
    data: {
      allyProfileId: internal.id,
      titulo,
      descripcion,
      ciudad,
      estadoRegion,
      huespedesMax: maxGuests,
      pricePerNightCents: price,
      currency: "USD",
      status: "DRAFT",
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "property.create",
    entidadTipo: "property",
    entidadId: p.id,
  });

  revalidatePath("/admin/propiedades");
}

async function cambiarEstadoPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) throw new Error("Falta id.");
  if (!["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(status)) {
    throw new Error("Estado inválido.");
  }

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: true, allyProfile: { include: { user: true } } },
  });
  if (!p) throw new Error("No existe.");

  if (status === "PUBLISHED") {
    if (!p.ownershipContractUrl || !p.ownershipContractPathname) throw new Error("Falta contrato de propiedad.");
    if (p.images.length < 1) throw new Error("Faltan imágenes.");
    if (p.images.length > 6) throw new Error("Máximo 6 imágenes.");
  }

  await prisma.property.update({
    where: { id },
    data: { status: status as PropertyStatus },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "property.update_status",
    entidadTipo: "property",
    entidadId: id,
    metadata: { status },
  });

  if (!p.allyProfile.isInternal && (status === "PUBLISHED" || status === "REJECTED")) {
    const to = p.allyProfile.user.email;
    await sendEmail({
      to,
      subject: status === "PUBLISHED" ? "Godplaces: tu propiedad fue verificada" : "Godplaces: tu propiedad fue rechazada",
      text:
        status === "PUBLISHED"
          ? `Tu propiedad fue verificada y publicada: ${p.titulo}`
          : `Tu propiedad fue rechazada: ${p.titulo}`,
    }).catch((e) => console.warn("[EMAIL][WARN] Falló envío de notificación de propiedad:", e));
  }

  revalidatePath("/admin/propiedades");
}

export default async function AdminPropiedadesPage() {
  const props = await prisma.property.findMany({
    include: { images: { take: 1, orderBy: { orden: "asc" } }, allyProfile: { include: { user: true } } },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Propiedades</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Revisiones y publicación del catálogo. Las propiedades de aliados pasan por <code>PENDING_APPROVAL</code>.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Nueva propiedad (inventario interno)</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearPropiedad} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" name="titulo" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" rows={5} required />
              </div>
              <VenezuelaStateCitySelect
                stateName="estadoRegion"
                cityName="ciudad"
                required
                defaultState=""
                defaultCity=""
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="huespedesMax">Huéspedes máx.</Label>
                  <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={4} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                  <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={5000} />
                </div>
              </div>
              <Button variant="brand" type="submit">
                Crear propiedad
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Listado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {props.length === 0 ? (
              <div className="text-sm text-muted-foreground">No hay propiedades.</div>
            ) : (
              props.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-foreground">{p.titulo}</div>
                      <div className="text-sm text-muted-foreground">
                        {p.ciudad}, {p.estadoRegion} ·{" "}
                        <span className="font-medium">{labelPropertyStatus(p.status)}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Aliado: {p.allyProfile.user.email} {p.allyProfile.isInternal ? "(interno)" : "(externo)"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">ID: {p.id}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/propiedades/${p.id}`}>Revisar</Link>
                      </Button>
                      {p.status === "PENDING_APPROVAL" ? (
                        <form action={cambiarEstadoPropiedad}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value="PUBLISHED" />
                          <Button size="sm" variant="brand" type="submit">
                            Verificar
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
