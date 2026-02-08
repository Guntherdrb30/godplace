"use client";

import React from "react";
import { useGod } from "@/components/ai/god-provider";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function HomeHero() {
  const god = useGod();
  const [texto, setTexto] = React.useState("");
  const [textoModal, setTextoModal] = React.useState("");

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
            <span className="h-2 w-2 rounded-full bg-marca-turquesa" aria-hidden="true" />
            Plataforma centralizada con verificación de aliados
          </p>

          <h1 className="font-[var(--font-display)] text-4xl leading-[1.05] tracking-tight text-marca-petroleo sm:text-6xl">
            Hospédate mejor en Venezuela con{" "}
            <span className="text-marca-turquesa">Godplaces.</span>
          </h1>

          <p className="max-w-xl text-lg leading-8 text-muted-foreground">
            Dinos en lenguaje natural cómo quieres hospedarte y God te guía sin inventar
            precios ni propiedades: siempre consulta el catálogo real.
          </p>

          <div className="rounded-2xl border bg-white/80 p-4 shadow-suave">
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
              <Button
                type="button"
                className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]"
                onClick={() => god.abrirConMensaje(texto)}
              >
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Buscar con Inteligencia Artificial
              </Button>

              <Dialog>
                <DialogTrigger asChild>
                  <Button type="button" variant="outline">
                    Reservar con IA
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Iniciar con God</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <label htmlFor="modal-ia" className="text-sm font-medium">
                      Describe tu reserva
                    </label>
                    <Textarea
                      id="modal-ia"
                      value={textoModal}
                      onChange={(e) => setTextoModal(e.target.value)}
                      rows={5}
                      placeholder="Ej: ‘Casa con piscina, 6 personas, 3 noches en Mérida, cerca del centro’"
                    />
                    <Button
                      type="button"
                      className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]"
                      onClick={() => god.abrirConMensaje(textoModal)}
                    >
                      Iniciar con God
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </motion.div>

        <motion.div
          className="relative overflow-hidden rounded-3xl border bg-white/80 p-6 shadow-suave"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: "easeOut" }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(50,181,173,0.10),transparent_40%,rgba(0,75,87,0.08))]" />
          <div className="relative space-y-4">
            <h2 className="font-[var(--font-display)] text-2xl tracking-tight">
              Confianza operada por una empresa central
            </h2>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>Verificación manual de aliados (KYC) por Admin/Root.</li>
              <li>Catálogo controlado: publicación con aprobación.</li>
              <li>Soporte operativo y auditoría de acciones.</li>
            </ul>
            <div className="rounded-xl border bg-white p-4 text-sm">
              <p className="font-medium text-foreground">Nota MVP</p>
              <p className="mt-1 text-muted-foreground">
                Los pagos reales no están activos todavía. Se registra la reserva y el
                split (fee plataforma / ganancias aliado) como snapshot.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
