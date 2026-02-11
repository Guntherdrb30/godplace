import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertyImageUploader } from "@/components/admin/property-image-uploader";
import { AdminPropertyContractUploader } from "@/components/admin/property-contract-uploader";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";
import type { PropertyStatus } from "@prisma/client";
import { sendEmail } from "@/lib/email";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Editar propiedad", path: "/admin/propiedades" });

async function actualizarPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "").trim();
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const estadoRegion = String(formData.get("estadoRegion") || "").trim();
  const direccion = String(formData.get("direccion") || "").trim() || null;
  const urbanizacion = String(formData.get("urbanizacion") || "").trim() || null;
  const calle = String(formData.get("calle") || "").trim() || null;
  const avenida = String(formData.get("avenida") || "").trim() || null;
  const nivelPlanta = String(formData.get("nivelPlanta") || "").trim() || null;
  const price = Number.parseInt(String(formData.get("pricePerNightCents") || "0"), 10) || 0;
  const maxGuests = Number.parseInt(String(formData.get("huespedesMax") || "1"), 10) || 1;
  const habitaciones = Number.parseInt(String(formData.get("habitaciones") || "1"), 10) || 1;
  const camas = Number.parseInt(String(formData.get("camas") || "1"), 10) || 1;
  const banos = Number.parseInt(String(formData.get("banos") || "1"), 10) || 1;

  if (!id) throw new Error("Falta id.");
  if (!titulo || !descripcion || !ciudad || !estadoRegion) throw new Error("Faltan campos.");
  if (price <= 0) throw new Error("Precio inválido.");
  if (maxGuests < 1) throw new Error("Huéspedes máx. inválido.");
  if (habitaciones < 1 || camas < 1 || banos < 1) throw new Error("Habitaciones/camas/baños inválidos.");

  await prisma.property.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      ciudad,
      estadoRegion,
      direccion,
      urbanizacion,
      calle,
      avenida,
      nivelPlanta,
      pricePerNightCents: price,
      huespedesMax: maxGuests,
      habitaciones,
      camas,
      banos,
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "property.update",
    entidadTipo: "property",
    entidadId: id,
  });

  revalidatePath(`/admin/propiedades/${id}`);
  revalidatePath("/admin/propiedades");
}

async function setStatus(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const notasAdmin = String(formData.get("notasAdmin") || "").trim() || null;

  try {
    if (!id) throw new Error("Falta id.");
    if (!["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(status)) {
      throw new Error("Estado inválido.");
    }

    const p = await prisma.property.findUnique({
      where: { id },
      include: { allyProfile: { include: { user: true } }, images: true },
    });
    if (!p) throw new Error("No existe la propiedad.");

    if (status === "PUBLISHED") {
      if (!p.ownershipContractUrl || !p.ownershipContractPathname) {
        throw new Error("Falta contrato de propiedad.");
      }
      if (p.images.length < 1) throw new Error("Faltan imágenes.");
      if (p.images.length > 6) throw new Error("Máximo 6 imágenes.");
    }

    await prisma.property.update({
      where: { id },
      data: { status: status as PropertyStatus, notasAdmin },
    });

    await registrarAuditoria({
      actorUserId: actor.id,
      accion: "property.update_status",
      entidadTipo: "property",
      entidadId: id,
      metadata: { status, notasAdmin },
    });

    if (!p.allyProfile.isInternal && (status === "PUBLISHED" || status === "REJECTED")) {
      const to = p.allyProfile.user.email;
      const subject =
        status === "PUBLISHED"
          ? "Godplaces: tu propiedad fue verificada"
          : "Godplaces: tu propiedad fue rechazada";
      const text =
        status === "PUBLISHED"
          ? [
              `Tu propiedad fue verificada y publicada: ${p.titulo}`,
              "",
              "Ya está visible en el catálogo.",
            ].join("\n")
          : [
              `Tu propiedad fue rechazada: ${p.titulo}`,
              notasAdmin ? `Notas: ${notasAdmin}` : "Notas: (no especificado)",
              "",
              "Puedes editarla y reenviar a revisión.",
            ].join("\n");

      await sendEmail({ to, subject, text }).catch((e) => {
        console.warn("[EMAIL][WARN] Falló envío de notificación de estado de propiedad:", e);
      });
    }

    revalidatePath(`/admin/propiedades/${id}`);
    revalidatePath("/admin/propiedades");
  } catch (e) {
    const msg = e instanceof Error && e.message ? e.message : "No se pudo actualizar el estado.";
    if (id) redirect(`/admin/propiedades/${id}?error=${encodeURIComponent(msg)}`);
    redirect(`/admin/propiedades?error=${encodeURIComponent(msg)}`);
  }
}

export default async function AdminPropiedadEditPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["ADMIN", "ROOT"]);
  const { id } = await props.params;
  const search = await props.searchParams;
  const errorMsg = typeof search.error === "string" && search.error.trim() ? search.error.trim() : null;

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: "asc" } }, allyProfile: { include: { user: true } } },
  });
  if (!p) notFound();

  const canPublish =
    Boolean(p.ownershipContractUrl && p.ownershipContractPathname) && p.images.length >= 1 && p.images.length <= 6;

  return (
    <Container className="max-w-7xl">
      <div className="mb-6 space-y-3">
        <Link href="/admin/propiedades" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver a propiedades
        </Link>

        {errorMsg ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
        ) : null}

        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[var(--font-display)] text-3xl tracking-tight">{p.titulo}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.ciudad}, {p.estadoRegion} · <span className="font-medium text-foreground">{labelPropertyStatus(p.status)}</span>
            </p>
          </div>
          <div className="text-xs text-muted-foreground">ID: {p.id}</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Detalles</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={actualizarPropiedad} className="grid gap-6">
              <input type="hidden" name="id" value={p.id} />

              <div className="grid gap-6 lg:grid-cols-2">
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="titulo">Título</Label>
                    <Input id="titulo" name="titulo" defaultValue={p.titulo} required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripción</Label>
                    <Textarea id="descripcion" name="descripcion" defaultValue={p.descripcion} rows={8} required />
                    <p className="text-xs text-muted-foreground">
                      Escribe una descripción clara: espacios, reglas, lo que incluye y lo que no incluye.
                    </p>
                  </div>
                  <VenezuelaStateCitySelect
                    stateName="estadoRegion"
                    cityName="ciudad"
                    required
                    defaultState={p.estadoRegion}
                    defaultCity={p.ciudad}
                  />
                </div>

                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="huespedesMax">Huéspedes máx.</Label>
                      <Input
                        id="huespedesMax"
                        name="huespedesMax"
                        type="number"
                        min={1}
                        defaultValue={p.huespedesMax}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                      <Input
                        id="pricePerNightCents"
                        name="pricePerNightCents"
                        type="number"
                        min={1}
                        defaultValue={p.pricePerNightCents}
                      />
                      <p className="text-xs text-muted-foreground">Ejemplo: 5000 = $50.00</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="habitaciones">Habitaciones</Label>
                      <Input id="habitaciones" name="habitaciones" type="number" min={1} defaultValue={p.habitaciones} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="camas">Camas</Label>
                      <Input id="camas" name="camas" type="number" min={1} defaultValue={p.camas} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="banos">Baños</Label>
                      <Input id="banos" name="banos" type="number" min={1} defaultValue={p.banos} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="direccion">Dirección (opcional)</Label>
                      <Input id="direccion" name="direccion" defaultValue={p.direccion || ""} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="urbanizacion">Urbanización (opcional)</Label>
                      <Input id="urbanizacion" name="urbanizacion" defaultValue={p.urbanizacion || ""} />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="calle">Calle (opcional)</Label>
                      <Input id="calle" name="calle" defaultValue={p.calle || ""} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="avenida">Avenida (opcional)</Label>
                      <Input id="avenida" name="avenida" defaultValue={p.avenida || ""} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nivelPlanta">Nivel/Planta (opcional)</Label>
                      <Input id="nivelPlanta" name="nivelPlanta" defaultValue={p.nivelPlanta || ""} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Recomendación: completa detalles, sube contrato e imágenes, luego publica.
                </p>
                <Button variant="brand" type="submit">
                  Guardar cambios
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl bg-white/85 shadow-suave">
            <CardHeader>
              <CardTitle>Checklist y publicación</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
                <div>
                  Aliado:{" "}
                  <span className="font-medium text-foreground">
                    {p.allyProfile.user.nombre || p.allyProfile.user.email}
                  </span>{" "}
                  <span className="text-xs text-muted-foreground">({p.allyProfile.user.email})</span>
                </div>
                <div className="mt-2 grid gap-1 text-xs">
                  <div>
                    Contrato:{" "}
                    <span className="font-medium text-foreground">
                      {p.ownershipContractUrl ? "cargado" : "pendiente"}
                    </span>
                  </div>
                  <div>
                    Imágenes: <span className="font-medium text-foreground">{p.images.length}/6</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border bg-white p-4">
                <div className="text-sm font-medium text-foreground">Contrato de propiedad</div>
                <div className="mt-3">
                  <AdminPropertyContractUploader
                    propertyId={p.id}
                    url={p.ownershipContractUrl}
                    pathname={p.ownershipContractPathname}
                  />
                </div>
              </div>

              <form action={setStatus} className="grid gap-3 rounded-2xl border bg-white p-4">
                <input type="hidden" name="id" value={p.id} />
                <div className="grid gap-2">
                  <Label htmlFor="notasAdmin">Notas (opcional)</Label>
                  <Textarea id="notasAdmin" name="notasAdmin" defaultValue={p.notasAdmin || ""} rows={3} />
                </div>
                {!canPublish ? (
                  <div className="rounded-xl border bg-white/70 p-3 text-xs text-muted-foreground">
                    Para publicar: carga el contrato y sube al menos 1 imagen (máx. 6).
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button name="status" value="PUBLISHED" type="submit" variant="brand" disabled={!canPublish}>
                    Verificar y publicar
                  </Button>
                  <Button name="status" value="REJECTED" type="submit" variant="outline">
                    Rechazar
                  </Button>
                  <Button name="status" value="DRAFT" type="submit" variant="outline">
                    Pasar a borrador
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Imágenes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sube entre 1 y 6 imágenes. La primera (orden 0) funciona como portada. Prioriza fotos claras, horizontales y
            bien iluminadas.
          </p>
          <PropertyImageUploader
            propertyId={p.id}
            images={p.images.map((i) => ({
              id: i.id,
              url: i.url,
              pathname: i.pathname,
              alt: i.alt,
              orden: i.orden,
            }))}
          />
        </CardContent>
      </Card>
    </Container>
  );
}
