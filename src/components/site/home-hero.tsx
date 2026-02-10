"use client";

import React from "react";
import { useGod } from "@/components/ai/god-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { HeroCarousel, type HeroSlidePublic } from "@/components/site/hero-carousel";

export type HomeHeroBranding = {
  brandName: string;
  agentName: string;
};

export function HomeHero(props: { slides: HeroSlidePublic[]; branding: HomeHeroBranding }) {
  const god = useGod();
  const [texto, setTexto] = React.useState("");

  return (
    <section className="pt-12 sm:pt-16">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <motion.div
          className="space-y-6"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <p className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-brand-primary" aria-hidden="true" />
            Plataforma centralizada con verificación de aliados
          </p>

          <h1 className="font-[var(--font-display)] text-4xl leading-[1.05] tracking-tight text-brand-secondary sm:text-6xl">
            Hospédate mejor en Venezuela con <span className="text-brand-primary">{props.branding.brandName}.</span>
          </h1>

          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Dinos en lenguaje natural cómo quieres hospedarte y {props.branding.agentName} te guía sin inventar precios ni propiedades: siempre
            consulta el catálogo real.
          </p>

          <div className="rounded-2xl border bg-white/80 p-4 shadow-suave">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const limpio = texto.trim();
                if (!limpio) return;
                god.abrirConMensaje(limpio);
                setTexto("");
              }}
            >
              <label htmlFor="busqueda-ia" className="text-sm font-medium">
                Búsqueda con IA
              </label>
              <Textarea
                id="busqueda-ia"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                className="mt-2"
                rows={4}
                placeholder="Cuéntanos cómo quieres hospedarte… Ej: ‘Apartamento para 4 personas, 2 noches en la playa, con vista al mar en Tucacas’"
              />

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button type="submit" variant="brand">
                  <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                  Buscar con Inteligencia Artificial
                </Button>

                <Button type="button" variant="outline" onClick={() => god.abrirModalReserva()}>
                  Reserva con Inteligencia Artificial
                </Button>
              </div>
            </form>
          </div>
        </motion.div>

        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
        >
          <HeroCarousel slides={props.slides} />
        </motion.div>
      </div>
    </section>
  );
}
