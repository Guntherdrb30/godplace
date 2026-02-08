import { Container } from "@/components/site/container";
import { PropertyCard } from "@/components/site/property-card";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

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
  const guestsRaw = typeof sp.huespedes === "string" ? sp.huespedes : "";
  const huespedes = guestsRaw ? Math.max(1, Number.parseInt(guestsRaw, 10) || 1) : 1;

  const items = await prisma.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(ciudad
        ? {
            ciudad: { contains: ciudad, mode: "insensitive" },
          }
        : {}),
      ...(huespedes
        ? {
            huespedesMax: { gte: huespedes },
          }
        : {}),
    },
    include: { images: { orderBy: { orden: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
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
            Resultados del catÃ¡logo aprobado por el operador central.
          </p>
        </div>

        <form className="grid gap-4 rounded-2xl border bg-white/80 p-5 shadow-suave sm:grid-cols-3">
          <div className="grid gap-2">
            <Label htmlFor="ciudad">Ciudad</Label>
            <Input id="ciudad" name="ciudad" defaultValue={ciudad} placeholder="Ej: Caracas, Valencia..." />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="huespedes">HuÃ©spedes</Label>
            <Input
              id="huespedes"
              name="huespedes"
              type="number"
              min={1}
              defaultValue={String(huespedes)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="w-full bg-brand-accent text-brand-secondary hover:bg-brand-accent/90">
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
            {items.map((p) => (
              <PropertyCard
                key={p.id}
                id={p.id}
                titulo={p.titulo}
                ciudad={p.ciudad}
                estadoRegion={p.estadoRegion}
                currency={p.currency}
                pricePerNightCents={p.pricePerNightCents}
                imageUrl={p.images[0]?.url ?? null}
              />
            ))}
          </div>
        )}
      </div>
    </Container>
  );
}
