import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { dbDisponible, DB_MISSING_MESSAGE } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import { HeroSlidesManager, type AdminHeroSlide } from "@/components/admin/hero-slides-manager";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Visual", path: "/admin/visual" });

export default async function AdminVisualPage() {
  await requireRole(["ADMIN", "ROOT"]);

  let slides: AdminHeroSlide[] = [];
  if (dbDisponible()) {
    try {
      const rows = await prisma.heroSlide.findMany({ orderBy: { orden: "asc" } });
      slides = rows.map((s) => ({
        id: s.id,
        title: s.title,
        subtitle: s.subtitle,
        ctaText: s.ctaText,
        ctaHref: s.ctaHref,
        imageUrl: s.imageUrl,
        imagePathname: s.imagePathname,
        orden: s.orden,
        active: s.active,
      }));
    } catch {
      slides = [];
    }
  }

  return (
    <Container>
      <div>
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Visual</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Controla las imágenes y textos del carrusel principal del home. Desarrollado y operado por Trends172Tech.com.
        </p>
      </div>

      {!dbDisponible() ? (
        <div className="mt-6 rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
          {DB_MISSING_MESSAGE}
        </div>
      ) : (
        <div className="mt-8">
          <HeroSlidesManager initialSlides={slides} />
        </div>
      )}
    </Container>
  );
}

