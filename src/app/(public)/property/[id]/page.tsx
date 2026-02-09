import { notFound } from "next/navigation";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { BookingWidget } from "@/components/site/booking-widget";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const p = await prisma.property.findFirst({
    where: { id, status: "PUBLISHED" },
    select: { titulo: true, descripcion: true },
  });
  if (!p) return buildMetadata({ title: "Propiedad" });
  return buildMetadata({
    title: p.titulo,
    description: p.descripcion.slice(0, 160),
    path: `/property/${id}`,
  });
}

export default async function PropertyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const p = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { orden: "asc" } },
      amenities: { include: { amenity: true } },
      allyProfile: true,
    },
  });
  if (!p || p.status !== "PUBLISHED") notFound();

  const hero = p.images[0]?.url || "/placeholder-propiedad.svg";

  return (
    <Container className="py-10">
      <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight">
              {p.titulo}
            </h1>
            <div className="text-sm text-muted-foreground">
              {p.ciudad}, {p.estadoRegion}
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border bg-secondary/30">
            <div className="relative aspect-[16/9]">
              <Image
                src={hero}
                alt={`Galería de ${p.titulo}`}
                fill
                className="object-cover"
                priority
              />
            </div>
          </div>

          {p.images.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-3">
              {p.images.slice(1, 4).map((img) => (
                <div key={img.id} className="relative aspect-[4/3] overflow-hidden rounded-2xl border bg-secondary/30">
                  <Image
                    src={img.url}
                    alt={img.alt || `Imagen de ${p.titulo}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="rounded-3xl border bg-white/80 p-7 shadow-suave">
            <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
              Detalles
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
              {p.descripcion}
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Badge variant="secondary">{p.huespedesMax} huéspedes máx.</Badge>
              <Badge variant="secondary">{p.habitaciones} habitaciones</Badge>
              <Badge variant="secondary">{p.camas} camas</Badge>
              <Badge variant="secondary">{p.banos} baños</Badge>
            </div>
          </div>

          <div className="rounded-3xl border bg-white/80 p-7 shadow-suave">
            <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
              Amenidades
            </h2>
            {p.amenities.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                No hay amenidades registradas aún.
              </p>
            ) : (
              <ul className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {p.amenities.map((pa) => (
                  <li key={pa.id} className="rounded-xl border bg-white p-3">
                    {pa.amenity.nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="lg:sticky lg:top-24">
          <BookingWidget
            propertyId={p.id}
            maxGuests={p.huespedesMax}
            currency={p.currency}
            pricePerNightCents={p.pricePerNightCents}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            Operación centralizada. Inventario del aliado:{" "}
            {p.allyProfile.isInternal ? "interno" : "aliado externo"}.
          </p>
        </div>
      </div>
    </Container>
  );
}
