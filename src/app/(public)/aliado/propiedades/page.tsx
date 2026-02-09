import Link from "next/link";
import { redirect } from "next/navigation";
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
import { labelPropertyStatus } from "@/lib/labels";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";
import { isAllyFullyApproved } from "@/lib/ally/approval";
import type { PropertyOperationType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Propiedades (Aliado)", path: "/aliado/propiedades" });

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

async function crearPropiedadAliado(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) throw new Error("No tienes perfil de aliado.");

  const ok = await isAllyFullyApproved(user.allyProfileId);
  if (!ok) throw new Error("Tu cuenta de aliado no está aprobada todavía.");

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

  if (!titulo || !descripcion || !ciudad || !estadoRegion || !urbanizacion || !calle) {
    throw new Error("Faltan campos obligatorios.");
  }
  if (!["RENT", "SALE"].includes(operationType)) throw new Error("Tipo de operación inválido.");
  if (price <= 0) throw new Error("El precio debe ser mayor a 0 (en centavos).");

  const p = await prisma.property.create({
    data: {
      allyProfileId: user.allyProfileId,
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
      huespedesMax: maxGuests,
      pricePerNightCents: price,
      currency: "USD",
      status: "DRAFT",
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_property.create_draft",
    entidadTipo: "property",
    entidadId: p.id,
    metadata: { operationType },
  });

  redirect(`/aliado/propiedades/${p.id}`);
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

  const [props, approved] = await Promise.all([
    prisma.property.findMany({
      where: { allyProfileId: user.allyProfileId },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    isAllyFullyApproved(user.allyProfileId),
  ]);

  return (
    <Container className="py-12">
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Mis propiedades</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Crea y gestiona tus propiedades. La publicación requiere aprobación del operador.
      </p>

      {!approved ? (
        <div className="mt-6 rounded-2xl border bg-white/70 p-5 text-sm text-muted-foreground">
          Tu cuenta de aliado aún no está aprobada. Completa tu proceso en{" "}
          <Link className="underline" href="/aliado/kyc">
            /aliado/kyc
          </Link>{" "}
          y sube tu contrato firmado en{" "}
          <Link className="underline" href="/aliado/contrato">
            /aliado/contrato
          </Link>
          .
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Nueva propiedad</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearPropiedadAliado} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="titulo">Título</Label>
                <Input id="titulo" name="titulo" required disabled={!approved} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea id="descripcion" name="descripcion" rows={5} required disabled={!approved} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="operationType">Operación</Label>
                <select id="operationType" name="operationType" className="h-10 rounded-md border bg-white px-3 text-sm" required disabled={!approved}>
                  <option value="RENT">Alquiler</option>
                  <option value="SALE">Venta</option>
                </select>
              </div>

              <VenezuelaStateCitySelect stateName="estadoRegion" cityName="ciudad" required defaultState="" defaultCity="" disabled={!approved} />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="urbanizacion">Urbanización</Label>
                  <Input id="urbanizacion" name="urbanizacion" required disabled={!approved} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="avenida">Avenida</Label>
                  <Input id="avenida" name="avenida" disabled={!approved} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="calle">Calle</Label>
                  <Input id="calle" name="calle" required disabled={!approved} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="nivelPlanta">Nivel / planta</Label>
                  <Input id="nivelPlanta" name="nivelPlanta" disabled={!approved} />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="huespedesMax">Huéspedes máx.</Label>
                  <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={4} disabled={!approved} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                  <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={5000} disabled={!approved} />
                </div>
              </div>

              <Button variant="brand" type="submit" disabled={!approved}>
                Crear borrador
              </Button>
              <p className="text-xs text-muted-foreground">
                Luego de crear el borrador, subirás el contrato de propiedad y hasta 6 imágenes, y enviarás a revisión.
              </p>
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
                    {p.ciudad}, {p.estadoRegion} · Estado:{" "}
                    <span className="font-medium text-foreground">{labelPropertyStatus(p.status)}</span>
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
