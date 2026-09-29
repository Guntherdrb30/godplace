import { prisma } from "@/lib/prisma";
import { dbDisponible } from "@/lib/db";
import { HomeHeroFull } from "@/components/site/home-hero-full";
import type { HeroSlidePublic } from "@/components/site/hero-carousel";

function fallbackSlides(): HeroSlidePublic[] {
  return [
    {
      id: "fallback-1",
      title: "Compra, alquila y descubre",
      subtitle: "Explora propiedades publicadas por inmobiliarias dentro de la red METRORA.",
      ctaText: "Explorar propiedades",
      ctaHref: "/search",
      imageUrl: "/placeholder-propiedad.svg",
    },
    {
      id: "fallback-2",
      title: "Una red inmobiliaria inteligente",
      subtitle: "Marketplace, CRM, inteligencia artificial y recorridos 3D en una sola plataforma.",
      ctaText: "Cómo funciona",
      ctaHref: "/#como-funciona",
      imageUrl: "/metrora-mark.svg",
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

  return <HomeHeroFull slides={slides} />;
}
