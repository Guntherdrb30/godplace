import { notFound } from "next/navigation";
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

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Editar propiedad", path: "/admin/propiedades" });

async function actualizarPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "");
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const estadoRegion = String(formData.get("estadoRegion") || "").trim();
  const price = Number.parseInt(String(formData.get("pricePerNightCents") || "0"), 10) || 0;
  const maxGuests = Number.parseInt(String(formData.get("huespedesMax") || "1"), 10) || 1;

  if (!id) throw new Error("Falta id.");
  if (!titulo || !descripcion || !ciudad || !estadoRegion) throw new Error("Faltan campos.");
  if (price <= 0) throw new Error("Precio invÃ¡lido.");

  await prisma.property.update({
    where: { id },
    data: {
      titulo,
      descripcion,
      ciudad,
      estadoRegion,
      pricePerNightCents: price,
      huespedesMax: maxGuests,
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
  if (!id) throw new Error("Falta id.");
  if (!["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(status)) throw new Error("Estado invÃ¡lido.");

  const p = await prisma.property.findUnique({
    where: { id },
    include: { allyProfile: { include: { user: true } }, images: true },
  });
  if (!p) throw new Error("No existe la propiedad.");

  if (status === "PUBLISHED") {
    if (!p.ownershipContractUrl || !p.ownershipContractPathname) {
      throw new Error("Falta contrato de propiedad.");
    }
    if (p.images.length < 1) throw new Error("Faltan imÃ¡genes.");
    if (p.images.length > 6) throw new Error("MÃ¡ximo 6 imÃ¡genes.");
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
            "Ya estÃ¡ visible en el catÃ¡logo.",
          ].join("\n")
        : [
            `Tu propiedad fue rechazada: ${p.titulo}`,
            notasAdmin ? `Notas: ${notasAdmin}` : "Notas: (no especificado)",
            "",
            "Puedes editarla y reenviar a revisiÃ³n.",
          ].join("\n");

    await sendEmail({ to, subject, text }).catch((e) => {
      console.warn("[EMAIL][WARN] FallÃ³ envÃ­o de notificaciÃ³n de estado de propiedad:", e);
    });
  }

  revalidatePath(`/admin/propiedades/${id}`);
  revalidatePath("/admin/propiedades");
}

export default async function AdminPropiedadEditPage(props: { params: Promise<{ id: string }> }) {
  await requireRole(["ADMIN", "ROOT"]);
  const { id } = await props.params;

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: "asc" } }, allyProfile: { include: { user: true } } },
  });
  if (!p) notFound();

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/propiedades" className="text-sm text-muted-foreground hover:text-foreground">
          â† Volver a propiedades
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Editar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
              <div>
                Estado actual:{" "}
                <span className="font-medium text-foreground">{labelPropertyStatus(p.status)}</span>
              </div>
              <div className="mt-1">
                Aliado:{" "}
                <span className="font-medium text-foreground">
                  {p.allyProfile.user.nombre || p.allyProfile.user.email}
                </span>{" "}
                <span className="text-xs text-muted-foreground">({p.allyProfile.user.email})</span>
              </div>
            </div>

            <form action={actualizarPropiedad} className="grid gap-4">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-2">
                <Label htmlFor="titulo">TÃ­tulo</Label>
                <Input id="titulo" name="titulo" defaultValue={p.titulo} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">DescripciÃ³n</Label>
                <Textarea id="descripcion" name="descripcion" defaultValue={p.descripcion} rows={6} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" name="ciudad" defaultValue={p.ciudad} required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estadoRegion">Estado</Label>
                  <Input id="estadoRegion" name="estadoRegion" defaultValue={p.estadoRegion} required />
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
              <Button variant="brand" type="submit">
                Guardar cambios
              </Button>
            </form>

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
              <div className="flex flex-wrap gap-2">
                <Button name="status" value="PUBLISHED" type="submit" variant="brand">
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

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>ImÃ¡genes</CardTitle>
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
