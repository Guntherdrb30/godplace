"use client";

import React from "react";
import { GodFab } from "@/components/ai/god-fab";
import { GodSheet } from "@/components/ai/god-sheet";
import { GodReservaModal } from "@/components/ai/god-reserva-modal";

export type AiBranding = {
  brandName: string;
  agentName: string;
};

type GodContextValue = {
  abrir: boolean;
  setAbrir: (v: boolean) => void;
  abrirConMensaje: (texto: string) => void;
  modalReservaAbierto: boolean;
  setModalReservaAbierto: (v: boolean) => void;
  abrirModalReserva: () => void;
  branding: AiBranding;
};

const GodContext = React.createContext<GodContextValue | null>(null);

export function useGod() {
  const ctx = React.useContext(GodContext);
  if (!ctx) throw new Error("useGod debe usarse dentro de <GodProvider />");
  return ctx;
}

export function GodProvider(props: { children: React.ReactNode; branding: AiBranding }) {
  const [abrir, setAbrir] = React.useState(false);
  const [mensajeInicial, setMensajeInicial] = React.useState<string | null>(null);
  const [modalReservaAbierto, setModalReservaAbierto] = React.useState(false);

  const abrirConMensaje = React.useCallback((texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    setMensajeInicial(limpio);
    setAbrir(true);
  }, []);

  const abrirModalReserva = React.useCallback(() => {
    setModalReservaAbierto(true);
  }, []);

  return (
    <GodContext.Provider
      value={{
        abrir,
        setAbrir,
        abrirConMensaje,
        modalReservaAbierto,
        setModalReservaAbierto,
        abrirModalReserva,
        branding: props.branding,
      }}
    >
      {props.children}
      <GodFab onClick={() => setAbrir(true)} label={props.branding.agentName} />
      <GodSheet
        open={abrir}
        onOpenChange={setAbrir}
        mensajeInicial={mensajeInicial}
        onConsumedMensajeInicial={() => setMensajeInicial(null)}
        branding={props.branding}
      />
      <GodReservaModal
        open={modalReservaAbierto}
        onOpenChange={setModalReservaAbierto}
        agentName={props.branding.agentName}
        onSubmit={(texto) => {
          setModalReservaAbierto(false);
          abrirConMensaje(texto);
        }}
      />
    </GodContext.Provider>
  );
}
