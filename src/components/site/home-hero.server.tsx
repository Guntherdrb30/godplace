import { prisma } from "@/lib/prisma";
import { dbDisponible } from "@/lib/db";
import { HomeHero } from "@/components/site/home-hero";
import type { HeroSlidePublic } from "@/components/site/hero-carousel";

function fallbackSlides(): HeroSlidePublic[] {
  return [
    {
      id: "fallback-1",
      title: "Playas, montaña y ciudad",
      subtitle: "Explora hospedajes aprobados y operados con control central.",
      ctaText: "Explorar propiedades",
      ctaHref: "/search",
      imageUrl: "/placeholder-propiedad.svg",
    },
    {
      id: "fallback-2",
      title: "Reserva con confianza",
      subtitle: "Verificación de aliados y auditoría de acciones operativas.",
      ctaText: "Cómo funciona",
      ctaHref: "/#como-funciona",
      imageUrl: "/logo-godplaces-placeholder.svg",
    },
  ];
}

export async function HomeHeroServer() {
  let slides: HeroSlidePublic[] = fallbackSlides();

  if (dbDisponible()) {
    try {
      const dbSlides = await prisma.heroSlide.findMany({
        where: { active: true },
        orderBy: { orden: "asc" },
        take: 10,
      });
      if (dbSlides.length > 0) {
        slides = dbSlides.map((s) => ({
          id: s.id,
          title: s.title,
          subtitle: s.subtitle,
          ctaText: s.ctaText,
          ctaHref: s.ctaHref,
          imageUrl: s.imageUrl,
        }));
      }
    } catch {
      // Fallback silencioso si DB no está disponible en runtime.
      slides = fallbackSlides();
    }
  }

  return <HomeHero slides={slides} />;
}
