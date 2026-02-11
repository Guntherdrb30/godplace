import Link from "next/link";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { PropertyStatus } from "@prisma/client";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertyCreateImagePicker } from "@/components/admin/property-create-image-picker";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Propiedades", path: "/admin/propiedades" });

async function crearPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

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
  const imagenes = formData
    .getAll("imagenes")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (!titulo || !descripcion || !ciudad || !estadoRegion) {
    throw new Error("Faltan campos obligatorios.");
  }
  if (price <= 0) throw new Error("El precio por noche debe ser mayor a 0 (en centavos).");
  if (maxGuests < 1) throw new Error("Huespedes max. invalido.");
  if (habitaciones < 1 || camas < 1 || banos < 1) throw new Error("Habitaciones/camas/banos invalidos.");
  if (imagenes.length > 6) throw new Error("Maximo 6 imagenes por propiedad.");

  for (const img of imagenes) {
    const ct = (img.type || "").toLowerCase();
    if (ct && !ct.startsWith("image/")) throw new Error("Solo se permiten archivos de imagen.");
    const maxBytes = 15 * 1024 * 1024;
    if (typeof img.size === "number" && img.size > maxBytes) {
      throw new Error("Cada imagen debe pesar maximo 15MB.");
    }
  }

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
      direccion,
      urbanizacion,
      calle,
      avenida,
      nivelPlanta,
      huespedesMax: maxGuests,
      habitaciones,
      camas,
      banos,
      pricePerNightCents: price,
      currency: "USD",
      status: "DRAFT",
    },
  });

  let imageCount = 0;
  for (const [index, img] of imagenes.entries()) {
    const safeName = (img.name || `imagen-${index + 1}`).replace(/[^a-zA-Z0-9._-]/g, "_");
    const pathname = `properties/${p.id}/${safeName}`;
    try {
      const up = await put(pathname, img, {
        access: "public",
        addRandomSuffix: true,
        contentType: img.type || undefined,
      });
      try {
        await prisma.propertyImage.create({
          data: {
            propertyId: p.id,
            url: up.url,
            pathname: up.pathname,
            alt: img.name || null,
            orden: imageCount,
          },
        });
        imageCount += 1;
      } catch (err) {
        await del(up.pathname).catch(() => {});
        console.warn("[property.create][image][db]", err);
      }
    } catch (err) {
      console.warn("[property.create][image][upload]", err);
    }
  }

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "property.create",
    entidadTipo: "property",
    entidadId: p.id,
    metadata: { imageCount },
  });

  redirect(`/admin/propiedades/${p.id}`);
}

async function cambiarEstadoPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) throw new Error("Falta id.");
  if (!["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(status)) {
    throw new Error("Estado invalido.");
  }

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: true, allyProfile: { include: { user: true } } },
  });
  if (!p) throw new Error("No existe.");

  if (status === "PUBLISHED") {
    if (!p.ownershipContractUrl || !p.ownershipContractPathname) throw new Error("Falta contrato de propiedad.");
    if (p.images.length < 1) throw new Error("Faltan imagenes.");
    if (p.images.length > 6) throw new Error("Maximo 6 imagenes.");
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
    }).catch((e) => console.warn("[EMAIL][WARN] Fallo envio de notificacion de propiedad:", e));
  }

  revalidatePath("/admin/propiedades");
}

export default async function AdminPropiedadesPage() {
  const props = await prisma.property.findMany({
    include: {
      images: { take: 1, orderBy: { orden: "asc" } },
      allyProfile: { include: { user: true } },
      _count: { select: { images: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container className="max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-white via-secondary/50 to-brand-primary/10 p-6 shadow-suave sm:p-8">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand-primary/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-12 bottom-2 h-40 w-40 rounded-full bg-brand-secondary/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-4">
          <div className="inline-flex w-fit items-center rounded-full border bg-white/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            Operacion interna de catalogo
          </div>
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-3xl tracking-tight sm:text-4xl">Gestor de propiedades</h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Carga una propiedad completa desde esta misma pantalla: datos, hasta 6 imagenes con previsualizacion y luego
              contrato/publicacion desde el editor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border bg-white/80 px-3 py-1">Maximo 6 imagenes</span>
            <span className="rounded-full border bg-white/80 px-3 py-1">Subida al guardar</span>
            <span className="rounded-full border bg-white/80 px-3 py-1">Estado inicial: DRAFT</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader className="space-y-3">
            <CardTitle>Nueva propiedad (inventario interno)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Llena el formulario y adjunta las imagenes aqui mismo. Si luego quieres ajustar orden o reemplazar fotos,
              puedes hacerlo en la vista de edicion.
            </p>
          </CardHeader>
          <CardContent>
            <form action={crearPropiedad} encType="multipart/form-data" className="grid gap-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="grid gap-4 rounded-2xl border bg-white/70 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Informacion principal</h2>
                  <div className="grid gap-2">
                    <Label htmlFor="titulo">Titulo</Label>
                    <Input id="titulo" name="titulo" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="descripcion">Descripcion</Label>
                    <Textarea id="descripcion" name="descripcion" rows={7} required />
                    <p className="text-xs text-muted-foreground">
                      Incluye lo que ofrece, reglas basicas y lo esencial para el huesped.
                    </p>
                  </div>
                  <VenezuelaStateCitySelect
                    stateName="estadoRegion"
                    cityName="ciudad"
                    required
                    defaultState=""
                    defaultCity=""
                  />
                </section>

                <section className="grid gap-4 rounded-2xl border bg-white/70 p-4">
                  <h2 className="text-sm font-semibold text-foreground">Capacidad y precios</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="huespedesMax">Huespedes max.</Label>
                      <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={4} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                      <Input
                        id="pricePerNightCents"
                        name="pricePerNightCents"
                        type="number"
                        min={1}
                        defaultValue={5000}
                      />
                      <p className="text-xs text-muted-foreground">Ejemplo: 5000 = $50.00</p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="habitaciones">Habitaciones</Label>
                      <Input id="habitaciones" name="habitaciones" type="number" min={1} defaultValue={1} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="camas">Camas</Label>
                      <Input id="camas" name="camas" type="number" min={1} defaultValue={1} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="banos">Banos</Label>
                      <Input id="banos" name="banos" type="number" min={1} defaultValue={1} />
                    </div>
                  </div>

                  <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicacion exacta</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2">
                      <Label htmlFor="direccion">Direccion (opcional)</Label>
                      <Input id="direccion" name="direccion" placeholder="Direccion o referencia" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="urbanizacion">Urbanizacion (opcional)</Label>
                      <Input id="urbanizacion" name="urbanizacion" />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="grid gap-2">
                      <Label htmlFor="calle">Calle (opcional)</Label>
                      <Input id="calle" name="calle" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="avenida">Avenida (opcional)</Label>
                      <Input id="avenida" name="avenida" />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="nivelPlanta">Nivel/Planta (opcional)</Label>
                      <Input id="nivelPlanta" name="nivelPlanta" />
                    </div>
                  </div>
                </section>
              </div>

              <PropertyCreateImagePicker className="rounded-2xl border bg-white/70 p-4" />

              <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Al guardar, se crea la propiedad y se suben las imagenes seleccionadas. Luego podras cargar contrato y
                  publicar en el editor.
                </p>
                <Button variant="brand" type="submit">
                  Crear y continuar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl bg-white/85 shadow-suave">
            <CardHeader>
              <CardTitle>Checklist rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">1. Cargar datos base</div>
                <p className="mt-1 text-xs">Titulo, descripcion, estado/ciudad, capacidad y precio.</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">2. Adjuntar imagenes</div>
                <p className="mt-1 text-xs">Selecciona entre 1 y 6 fotos. Tendras previsualizacion antes de guardar.</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">3. Completar en editor</div>
                <p className="mt-1 text-xs">Sube contrato, revisa detalles y publica cuando este completo.</p>
              </div>
              <div className="rounded-2xl border bg-brand-primary/10 p-4 text-xs text-brand-secondary">
                El catalogo exige contrato + minimo 1 imagen para publicar.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
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
                      {p.ciudad}, {p.estadoRegion} · <span className="font-medium">{labelPropertyStatus(p.status)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Aliado: {p.allyProfile.user.email} {p.allyProfile.isInternal ? "(interno)" : "(externo)"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Contrato:{" "}
                      <span className="font-medium text-foreground">{p.ownershipContractUrl ? "cargado" : "pendiente"}</span>{" "}
                      · Imagenes: <span className="font-medium text-foreground">{p._count.images}/6</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">ID: {p.id}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/propiedades/${p.id}`}>Editar / cargar</Link>
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
    </Container>
  );
}
