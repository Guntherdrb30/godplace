"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HeroSlidePublic = {
  id: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  ctaHref: string | null;
  imageUrl: string;
};

export function HeroCarousel(props: { slides: HeroSlidePublic[] }) {
  const slides = props.slides;
  const [index, setIndex] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (slides.length <= 1) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 6500);
    return () => clearInterval(t);
  }, [paused, slides.length]);

  React.useEffect(() => {
    // Mantener índice válido si cambia el array.
    setIndex((i) => (slides.length === 0 ? 0 : Math.min(i, slides.length - 1)));
  }, [slides.length]);

  const current = slides[index];
  const canNav = slides.length > 1;

  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-white/80 shadow-suave"
      aria-roledescription="carousel"
      aria-label="Carrusel principal"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative aspect-[4/3] sm:aspect-[16/11]">
        {current ? (
          <>
            <Image
              src={current.imageUrl}
              alt={current.title || "Imagen destacada"}
              fill
              priority
              className="object-cover"
              sizes="(min-width: 1024px) 40vw, 100vw"
            />
            <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(0,75,87,0.65),rgba(0,75,87,0.15)_55%,rgba(0,0,0,0.05))]" />
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              <div className="max-w-[22rem] space-y-2">
                {current.title ? (
                  <div className="font-[var(--font-display)] text-2xl tracking-tight text-white sm:text-3xl">
                    {current.title}
                  </div>
                ) : null}
                {current.subtitle ? (
                  <div className="text-sm leading-6 text-white/85">{current.subtitle}</div>
                ) : null}
                {current.ctaText && current.ctaHref ? (
                  <div className="pt-2">
                    <Button
                      asChild
                      className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90"
                    >
                      <Link href={current.ctaHref}>{current.ctaText}</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/40">
            <div className="text-sm text-muted-foreground">Sin imágenes todavía.</div>
          </div>
        )}

        {canNav ? (
          <>
            <button
              type="button"
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 p-2 text-foreground shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Anterior"
              onClick={() => setIndex((i) => (i - 1 + slides.length) % slides.length)}
            >
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border bg-white/80 p-2 text-foreground shadow-sm backdrop-blur hover:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
              aria-label="Siguiente"
              onClick={() => setIndex((i) => (i + 1) % slides.length)}
            >
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </>
        ) : null}
      </div>

      {canNav ? (
        <div className="flex items-center justify-center gap-2 p-3">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Ir a slide ${i + 1}`}
              aria-current={i === index ? "true" : "false"}
              className={[
                "h-2.5 w-2.5 rounded-full border transition",
                i === index ? "bg-brand-primary border-brand-primary" : "bg-white/70 border-white/70 hover:bg-white",
              ].join(" ")}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

