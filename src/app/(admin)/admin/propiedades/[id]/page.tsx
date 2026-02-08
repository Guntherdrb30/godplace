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
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";

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
  if (price <= 0) throw new Error("Precio inválido.");

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

export default async function AdminPropiedadEditPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: "asc" } } },
  });
  if (!p) notFound();

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/propiedades" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver a propiedades
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Editar</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={actualizarPropiedad} className="grid gap-4">
              <input type="hidden" name="id" value={p.id} />
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" name="titulo" defaultValue={p.titulo} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
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
                  <Label htmlFor="huespedesMax">Huéspedes máx.</Label>
                  <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={p.huespedesMax} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                  <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={p.pricePerNightCents} />
                </div>
              </div>
              <Button className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]" type="submit">
                Guardar cambios
              </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground">
              Estado actual:{" "}
              <span className="font-medium text-foreground">
                {labelPropertyStatus(p.status)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Imágenes</CardTitle>
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
