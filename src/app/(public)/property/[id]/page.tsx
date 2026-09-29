import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { BookingWidget } from "@/components/site/booking-widget";
import { Badge } from "@/components/ui/badge";
import { MarketplaceLeadForm } from "@/components/site/marketplace-lead-form";
import { formatMoney } from "@/lib/format";
import { listingOperationLabel, listingPriceSuffix } from "@/lib/listings";

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

export default async function PropertyPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await props.params;
  const sp = await props.searchParams;
  const requestedListingId = typeof sp.listing === "string" ? sp.listing : null;
  const p = await prisma.property.findUnique({
    where: { id },
    include: {
      images: { orderBy: { orden: "asc" } },
      amenities: { include: { amenity: true } },
      allyProfile: true,
      tenant: {
        select: {
          name: true,
          status: true,
          logoUrl: true,
          primaryHsl: true,
          secondaryHsl: true,
          contactEmail: true,
          contactPhone: true,
          contactWhatsapp: true,
          websiteUrl: true,
        },
      },
      listings: {
        where: { status: "PUBLISHED" },
        select: {
          id: true,
          title: true,
          operationType: true,
          priceCents: true,
          currency: true,
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!p || p.status !== "PUBLISHED" || p.tenant.status !== "ACTIVE") notFound();

  const hero = p.images[0]?.url || "/placeholder-propiedad.svg";
  const selectedListing =
    (requestedListingId ? p.listings.find((listing) => listing.id === requestedListingId) : null) ||
    p.listings[0] ||
    null;
  const shortRentListing = p.listings.find((listing) => listing.operationType === "SHORT_RENT") || null;

  return (
    <Container className="py-10">
      <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr] lg:items-start">
        <div className="space-y-8">
          <div className="space-y-3">
            <h1 className="font-[var(--font-display)] text-4xl tracking-tight">
              {selectedListing?.title || p.titulo}
            </h1>
            <div className="text-sm text-muted-foreground">
              {p.ciudad}, {p.estadoRegion}
            </div>
            {selectedListing ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{listingOperationLabel(selectedListing.operationType)}</Badge>
                <span className="text-2xl font-semibold text-foreground">
                  {formatMoney(selectedListing.priceCents, selectedListing.currency)}
                  {listingPriceSuffix(selectedListing.operationType) ? (
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      {listingPriceSuffix(selectedListing.operationType)}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
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

          {p.listings.length > 1 ? (
            <div className="rounded-3xl border bg-white/80 p-7 shadow-suave">
              <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
                Opciones disponibles
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {p.listings.map((listing) => (
                  <Link
                    key={listing.id}
                    href={`/property/${p.id}?listing=${listing.id}`}
                    className={[
                      "rounded-2xl border p-4 transition-colors",
                      selectedListing?.id === listing.id
                        ? "border-brand-primary bg-brand-primary/5"
                        : "bg-white hover:bg-secondary/40",
                    ].join(" ")}
                  >
                    <div className="text-sm font-medium">{listingOperationLabel(listing.operationType)}</div>
                    <div className="mt-1 text-lg font-semibold">
                      {formatMoney(listing.priceCents, listing.currency)}
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {listingPriceSuffix(listing.operationType)}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}

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

        <div className="space-y-5 lg:sticky lg:top-24">
          <MarketplaceLeadForm
            propertyId={p.id}
            agencyName={p.tenant.name}
            agencyLogoUrl={p.tenant.logoUrl}
            agencyPhone={p.tenant.contactPhone}
            agencyWhatsapp={p.tenant.contactWhatsapp}
            agencyWebsiteUrl={p.tenant.websiteUrl}
            listings={p.listings}
            initialListingId={selectedListing?.id ?? null}
          />
          {shortRentListing ? (
            <BookingWidget
              propertyId={p.id}
              listingId={shortRentListing.id}
              maxGuests={p.huespedesMax}
              currency={shortRentListing.currency}
              pricePerNightCents={shortRentListing.priceCents}
            />
          ) : null}
          <div className="rounded-2xl border bg-white/70 p-4 text-xs text-muted-foreground">
            <div>Publicado en METRORA por <span className="font-medium text-foreground">{p.tenant.name}</span>.</div>
            {p.tenant.contactEmail ? <div className="mt-1">Email: {p.tenant.contactEmail}</div> : null}
            <div className="mt-1">Inventario: {p.allyProfile.isInternal ? "interno" : "aliado externo"}.</div>
          </div>
        </div>
      </div>
    </Container>
  );
}
