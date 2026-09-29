import { Container } from "@/components/site/container";
import { PropertyCard } from "@/components/site/property-card";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { ListingOperationType, PropertyType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Explorar",
  path: "/search",
});

export default async function SearchPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const ciudad = typeof sp.ciudad === "string" ? sp.ciudad.trim() : "";
  const operation =
    typeof sp.operacion === "string" && ["SALE","SHORT_RENT","LONG_RENT","COMMERCIAL_RENT"].includes(sp.operacion)
      ? (sp.operacion as ListingOperationType)
      : null;
  const propertyType =
    typeof sp.tipo === "string" && ["HOUSE","APARTMENT","TOWNHOUSE","LAND","OFFICE","COMMERCIAL","WAREHOUSE","BUILDING","FARM","HOTEL","VACATION","OTHER"].includes(sp.tipo)
      ? (sp.tipo as PropertyType)
      : null;

  const items = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      tenant: { is: { status: "ACTIVE" } },
      property: {
        status: "PUBLISHED",
        ...(ciudad ? { ciudad: { contains: ciudad, mode: "insensitive" } } : {}),
        ...(propertyType ? { propertyType } : {}),
      },
      ...(operation ? { operationType: operation } : {}),
    },
    include: {
      tenant: { select: { name: true } },
      property: {
        include: { images: { orderBy: { orden: "asc" }, take: 1 } },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: 60,
  });

  return (
    <Container className="py-10">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl tracking-tight">
            Explorar propiedades
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Propiedades publicadas por las inmobiliarias participantes de METRORA.
          </p>
        </div>

        <form className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-suave md:grid-cols-4">
          <div className="grid gap-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" defaultValue={ciudad} placeholder="Ej: Caracas, Valencia..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="operacion">Operación</Label>
            <select id="operacion" name="operacion" defaultValue={operation || ""} className="h-10 rounded-md border bg-white px-3 text-sm">
              <option value="">Todas</option>
              <option value="SALE">Venta</option>
              <option value="SHORT_RENT">Alquiler temporal</option>
              <option value="LONG_RENT">Alquiler residencial</option>
              <option value="COMMERCIAL_RENT">Alquiler comercial</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo</Label>
            <select id="tipo" name="tipo" defaultValue={propertyType || ""} className="h-10 rounded-md border bg-white px-3 text-sm">
              <option value="">Todos</option>
              <option value="HOUSE">Casa</option>
              <option value="APARTMENT">Apartamento</option>
              <option value="TOWNHOUSE">Townhouse</option>
              <option value="LAND">Terreno</option>
              <option value="OFFICE">Oficina</option>
              <option value="COMMERCIAL">Local comercial</option>
              <option value="WAREHOUSE">Galpón</option>
              <option value="BUILDING">Edificio</option>
              <option value="FARM">Finca</option>
              <option value="HOTEL">Hotel / Posada</option>
              <option value="VACATION">Vacacional</option>
              <option value="OTHER">Otro</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="brand" className="w-full">
              Filtrar
            </Button>
          </div>
        </form>

        {items.length === 0 ? (
          <div className="rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
            No se encontraron propiedades con estos filtros.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((listing) => (
              <PropertyCard
                key={listing.id}
                id={listing.property.id}
                listingId={listing.id}
                titulo={listing.title}
                ciudad={listing.property.ciudad}
                estadoRegion={listing.property.estadoRegion}
                currency={listing.currency}
                priceCents={listing.priceCents}
                operationType={listing.operationType}
                imageUrl={listing.property.images[0]?.url ?? null}
                agencyName={listing.tenant.name}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
