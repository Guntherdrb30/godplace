import { Container } from "@/components/site/container";
import { HomeHero } from "@/components/site/home-hero";
import { PropertyCard } from "@/components/site/property-card";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({
  title: "Inicio",
  path: "/",
});

export default async function HomePage() {
  const destacados = await prisma.property.findMany({
    where: { status: "PUBLISHED" },
    include: { images: { orderBy: { orden: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });

  return (
    <div>
      <Container>
        <HomeHero />

        <section className="mt-14">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
                Destacados
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Propiedades publicadas y aprobadas por el operador central.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/search">Ver todo</Link>
            </Button>
          </div>

          {destacados.length === 0 ? (
            <div className="mt-6 rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
              Aún no hay propiedades publicadas. Si eres ADMIN/ROOT, carga el inventario
              en <Link className="underline" href="/admin">/admin</Link>.
            </div>
          ) : (
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {destacados.map((p) => (
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
        </section>

        <section id="como-funciona" className="mt-16 scroll-mt-24">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
            Cómo funciona
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {[
              {
                t: "Explora",
                d: "Busca y compara propiedades publicadas en Venezuela.",
              },
              {
                t: "Cotiza",
                d: "Selecciona fechas y huéspedes. Guardamos el snapshot del precio.",
              },
              {
                t: "Reserva",
                d: "Creamos un borrador y luego confirmación. Pagos reales: TODO MVP.",
              },
            ].map((x) => (
              <div key={x.t} className="rounded-2xl border bg-white/80 p-6 shadow-suave">
                <div className="font-medium text-foreground">{x.t}</div>
                <div className="mt-2 text-sm leading-6 text-muted-foreground">{x.d}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="seguridad" className="mt-16 scroll-mt-24">
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
            Verificación y seguridad
          </h2>
          <div className="mt-6 rounded-3xl border bg-white/80 p-8 shadow-suave">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="font-medium text-foreground">KYC de aliados</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Se revisa cédula, RIF, selfie con cédula y documento de propiedad/poder.
                  Admin/Root aprueban o rechazan con notas.
                </p>
              </div>
              <div>
                <p className="font-medium text-foreground">Auditoría</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Acciones operativas se registran en <code>audit_logs</code> para control
                  interno. Configuración crítica solo por ROOT.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-16 mb-2">
          <div className="rounded-3xl border bg-marca-petroleo p-10 text-white shadow-suave">
            <h2 className="font-[var(--font-display)] text-3xl tracking-tight">
              Publica y opera con control central
            </h2>
            <p className="mt-3 max-w-2xl text-white/85">
              Godplaces. está diseñado para un catálogo aprobado y una operación con roles
              (ROOT/ADMIN/ALIADO/CLIENTE) y verificación manual.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]">
                <Link href="/search">Explorar propiedades</Link>
              </Button>
              <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </div>
          </div>
        </section>
      </Container>
    </div>
  );
}
