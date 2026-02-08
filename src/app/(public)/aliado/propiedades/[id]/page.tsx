import { notFound } from "next/navigation";
import Link from "next/link";
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
import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Editar (Aliado)", path: "/aliado/propiedades" });

async function actualizar(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) throw new Error("No tienes perfil de aliado.");

  const id = String(formData.get("id") || "");
  const titulo = String(formData.get("titulo") || "").trim();
  const descripcion = String(formData.get("descripcion") || "").trim();
  const ciudad = String(formData.get("ciudad") || "").trim();
  const estadoRegion = String(formData.get("estadoRegion") || "").trim();
  const price = Number.parseInt(String(formData.get("pricePerNightCents") || "0"), 10) || 0;
  const maxGuests = Number.parseInt(String(formData.get("huespedesMax") || "1"), 10) || 1;

  const prop = await prisma.property.findUnique({
    where: { id },
    select: { allyProfileId: true, status: true },
  });
  if (!prop || prop.allyProfileId !== user.allyProfileId) throw new Error("No autorizado.");

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
      // Mantiene estado. Si fue REJECTED/DRAFT, el aliado puede volver a enviar a revisión manualmente (TODO).
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

export default async function AliadoPropiedadEditPage(props: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) notFound();

  const { id } = await props.params;
  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { orden: "asc" } } },
  });
  if (!p || p.allyProfileId !== user.allyProfileId) notFound();

  return (
    <Container className="py-12">
      <div className="mb-6">
        <Link href="/aliado/propiedades" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver a mis propiedades
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Editar propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={actualizar} className="grid gap-4">
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
              <Button className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" type="submit">
                Guardar
              </Button>
            </form>
            <div className="mt-4 text-xs text-muted-foreground">
              Estado:{" "}
              <span className="font-medium text-foreground">
                {labelPropertyStatus(p.status)}
              </span>{" "}
              (publicación requiere aprobación).
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
