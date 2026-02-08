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
import { registrarAuditoria } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { labelPropertyStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Propiedades (Aliado)", path: "/aliado/propiedades" });

async function crearPropiedadAliado(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) throw new Error("No tienes perfil de aliado.");

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

  const p = await prisma.property.create({
    data: {
      allyProfileId: user.allyProfileId,
      titulo,
      descripcion,
      ciudad,
      estadoRegion,
      huespedesMax: maxGuests,
      pricePerNightCents: price,
      currency: "USD",
      status: "PENDING_APPROVAL",
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property.create",
    entidadTipo: "property",
    entidadId: p.id,
  });

  revalidatePath("/aliado/propiedades");
}

export default async function AliadoPropiedadesPage() {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) {
    return (
      <Container className="py-12">
        <div className="rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
          Primero inicia tu proceso en <Link className="underline" href="/aliado">/aliado</Link>.
        </div>
      </Container>
    );
  }

  const props = await prisma.property.findMany({
    where: { allyProfileId: user.allyProfileId },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container className="py-12">
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">
        Mis propiedades
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea y gestiona tus propiedades. La publicaciÃ³n requiere aprobaciÃ³n del operador.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Nueva propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearPropiedadAliado} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">TÃ­tulo</Label>
                <Input id="titulo" name="titulo" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">DescripciÃ³n</Label>
                <Textarea id="descripcion" name="descripcion" rows={5} required />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="ciudad">Ciudad</Label>
                  <Input id="ciudad" name="ciudad" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estadoRegion">Estado</Label>
                  <Input id="estadoRegion" name="estadoRegion" required />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="huespedesMax">HuÃ©spedes mÃ¡x.</Label>
                  <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={4} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                  <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={5000} />
                </div>
              </div>
              <Button className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" type="submit">
                Enviar a revisiÃ³n
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
              <div className="text-sm text-muted-foreground">No has creado propiedades.</div>
            ) : (
              props.map((p) => (
                <div key={p.id} className="rounded-2xl border bg-white p-4">
                  <div className="font-medium text-foreground">{p.titulo}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {p.ciudad}, {p.estadoRegion} Â· Estado:{" "}
                    <span className="font-medium text-foreground">
                      {labelPropertyStatus(p.status)}
                    </span>
                  </div>
                  <div className="mt-3">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/aliado/propiedades/${p.id}`}>Editar</Link>
                    </Button>
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
