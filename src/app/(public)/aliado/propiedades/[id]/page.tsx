import { notFound } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertyImageUploader } from "@/components/admin/property-image-uploader";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";
import { PropertyContractUploader } from "@/components/ally/property-contract-uploader";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";
import { isAllyFullyApproved } from "@/lib/ally/approval";
import { sendEmail } from "@/lib/email";
import type { PropertyOperationType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Editar (Aliado)", path: "/aliado/propiedades" });

function buildDireccion(input: {
  estadoRegion: string;
  ciudad: string;
  urbanizacion: string;
  avenida: string;
  calle: string;
  nivelPlanta: string;
}) {
  const parts = [
    input.urbanizacion ? `Urb. ${input.urbanizacion}` : "",
    input.avenida ? `Av. ${input.avenida}` : "",
    input.calle ? `Calle ${input.calle}` : "",
    input.nivelPlanta ? `Nivel/Planta: ${input.nivelPlanta}` : "",
    `${input.ciudad}, ${input.estadoRegion}`,
  ].filter(Boolean);
  return parts.join(" | ");
}

async function actualizar(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) throw new Error("No tienes perfil de aliado.");

  const ok = await isAllyFullyApproved(user.allyProfileId);
  if (!ok) throw new Error("Tu cuenta de aliado no estÃ¡ aprobada.");

  const id = String(formData.get("id") || "");
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const operationType = String(formData.get("operationType") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const estadoRegion = String(formData.get("estadoRegion") || "").trim();
  const urbanizacion = String(formData.get("urbanizacion") || "").trim();
  const avenida = String(formData.get("avenida") || "").trim();
  const calle = String(formData.get("calle") || "").trim();
  const nivelPlanta = String(formData.get("nivelPlanta") || "").trim();
  const price = Number.parseInt(String(formData.get("pricePerNightCents") || "0"), 10) || 0;
  const maxGuests = Number.parseInt(String(formData.get("huespedesMax") || "1"), 10) || 1;

  const prop = await prisma.property.findUnique({
    where: { id },
    select: { allyProfileId: true, status: true },
  });
  if (!prop || prop.allyProfileId !== user.allyProfileId) throw new Error("No autorizado.");

  if (!titulo || !descripcion || !ciudad || !estadoRegion || !urbanizacion || !calle) throw new Error("Faltan campos.");
  if (!["RENT", "SALE"].includes(operationType)) throw new Error("OperaciÃ³n invÃ¡lida.");
  if (price <= 0) throw new Error("Precio invÃ¡lido.");

  await prisma.property.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      operationType: operationType as PropertyOperationType,
      ciudad,
      estadoRegion,
      urbanizacion,
      avenida: avenida || null,
      calle,
      nivelPlanta: nivelPlanta || null,
      direccion: buildDireccion({ estadoRegion, ciudad, urbanizacion, avenida, calle, nivelPlanta }),
      pricePerNightCents: price,
      huespedesMax: maxGuests,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property.update",
    entidadTipo: "property",
    entidadId: id,
  });

  revalidatePath(`/aliado/propiedades/${id}`);
  revalidatePath("/aliado/propiedades");
}

async function enviarARevision(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) throw new Error("No tienes perfil de aliado.");

  const ok = await isAllyFullyApproved(user.allyProfileId);
  if (!ok) throw new Error("Tu cuenta de aliado no estÃ¡ aprobada.");

  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Falta id.");

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: true, allyProfile: { include: { user: true } } },
  });
  if (!p || p.allyProfileId !== user.allyProfileId) throw new Error("No autorizado.");

  if (!(p.status === "DRAFT" || p.status === "REJECTED")) {
    throw new Error("Esta propiedad no puede enviarse a revisiÃ³n en su estado actual.");
  }

  if (!p.ownershipContractUrl || !p.ownershipContractPathname) {
    throw new Error("Debes subir el contrato de propiedad antes de enviar a revisiÃ³n.");
  }

  const imagesCount = p.images.length;
  if (imagesCount < 1) throw new Error("Debes subir al menos 1 imagen.");
  if (imagesCount > 6) throw new Error("MÃ¡ximo 6 imÃ¡genes.");

  if (!p.titulo || !p.descripcion || !p.estadoRegion || !p.ciudad || !p.urbanizacion || !p.calle) {
    throw new Error("Faltan datos de direcciÃ³n o contenido.");
  }

  await prisma.property.update({
    where: { id },
    data: { status: "PENDING_APPROVAL" },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property.submit_for_review",
    entidadTipo: "property",
    entidadId: id,
  });

  const to = p.allyProfile.user.email;
  const subject = "Godplaces: tu propiedad estÃ¡ en revisiÃ³n";
  const text = [
    `Recibimos tu propiedad: ${p.titulo}`,
    `Estado: En revisiÃ³n`,
    "",
    "Nuestro equipo la revisarÃ¡ y te notificaremos cuando sea aprobada o si necesitamos ajustes.",
  ].join("\n");
  await sendEmail({ to, subject, text }).catch((e) => {
    console.warn("[EMAIL][WARN] FallÃ³ envÃ­o de email de revisiÃ³n de propiedad:", e);
  });

  revalidatePath(`/aliado/propiedades/${id}`);
  revalidatePath("/aliado/propiedades");
}

export default async function AliadoPropiedadEditPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) notFound();

  const ok = await isAllyFullyApproved(user.allyProfileId);
  if (!ok) {
    return (
      <Container className="py-12">
        <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
          Tu cuenta de aliado no estÃ¡ aprobada. Completa tu proceso en{" "}
          <Link className="underline" href="/aliado/kyc">
            /aliado/kyc
          </Link>{" "}
          y{" "}
          <Link className="underline" href="/aliado/contrato">
            /aliado/contrato
          </Link>
          .
        </div>
      </Container>
    );
  }

  const { id } = await props.params;
  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: "asc" } } },
  });
  if (!p || p.allyProfileId !== user.allyProfileId) notFound();

  const canSubmit = p.status === "DRAFT" || p.status === "REJECTED";

  return (
    <Container className="py-12">
      <div className="mb-6">
        <Link href="/aliado/propiedades" className="text-sm text-muted-foreground hover:text-foreground">
          â† Volver a mis propiedades
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Editar propiedad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <form action={actualizar} className="grid gap-4">
              <input type="hidden" name="id" value={p.id} />

              <div className="grid gap-2">
                <Label htmlFor="titulo">TÃ­tulo</Label>
                <Input id="titulo" name="titulo" defaultValue={p.titulo} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">DescripciÃ³n</Label>
                <Textarea id="descripcion" name="descripcion" defaultValue={p.descripcion} rows={6} required />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="operationType">OperaciÃ³n</Label>
                <select
                  id="operationType"
                  name="operationType"
                  className="h-10 rounded-md border bg-white px-3 text-sm"
                  defaultValue={p.operationType}
                  required
                >
                  <option value="RENT">Alquiler</option>
                  <option value="SALE">Venta</option>
                </select>
              </div>

              <VenezuelaStateCitySelect
                stateName="estadoRegion"
                cityName="ciudad"
                required
                defaultState={p.estadoRegion}
                defaultCity={p.ciudad}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="urbanizacion">UrbanizaciÃ³n</Label>
                  <Input id="urbanizacion" name="urbanizacion" defaultValue={p.urbanizacion || ""} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avenida">Avenida</Label>
                  <Input id="avenida" name="avenida" defaultValue={p.avenida || ""} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input id="calle" name="calle" defaultValue={p.calle || ""} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nivelPlanta">Nivel / planta</Label>
                  <Input id="nivelPlanta" name="nivelPlanta" defaultValue={p.nivelPlanta || ""} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="huespedesMax">HuÃ©spedes mÃ¡x.</Label>
                  <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={p.huespedesMax} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                  <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={p.pricePerNightCents} />
                </div>
              </div>

              <Button className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" type="submit">
                Guardar
              </Button>
            </form>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-foreground">Contrato de propiedad</div>
              <div className="mt-3">
                <PropertyContractUploader
                  propertyId={p.id}
                  url={p.ownershipContractUrl}
                  pathname={p.ownershipContractPathname}
                  disabled={p.status === "PUBLISHED"}
                />
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Estado:{" "}
              <span className="font-medium text-foreground">{labelPropertyStatus(p.status)}</span>
            </div>

            {canSubmit ? (
              <form action={enviarARevision} className="flex justify-end">
                <input type="hidden" name="id" value={p.id} />
                <Button className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" type="submit">
                  Enviar a revisiÃ³n
                </Button>
              </form>
            ) : (
              <div className="rounded-2xl border bg-white/70 p-4 text-sm text-muted-foreground">
                Esta propiedad ya estÃ¡ en revisiÃ³n o publicada. Si fue rechazada, podrÃ¡s editar y reenviar.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>ImÃ¡genes (mÃ¡ximo 6)</CardTitle>
          </CardHeader>
          <CardContent>
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
      </div>
    </Container>
  );
}

