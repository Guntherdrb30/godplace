"use client";

import { HeroCarousel, type HeroSlidePublic } from "@/components/site/hero-carousel";

export function HomeHeroFull(props: { slides: HeroSlidePublic[] }) {
  return (
    <section className="pt-2 sm:pt-4">
      {/* Full-bleed (edge-to-edge) hero right after the header */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen">
        <HeroCarousel slides={props.slides} variant="full" />
      </div>
    </section>
  );
}

