"use client";

import React from "react";
import { GodFab } from "@/components/ai/god-fab";
import { GodSheet } from "@/components/ai/god-sheet";

type GodContextValue = {
  abrir: boolean;
  setAbrir: (v: boolean) => void;
  abrirConMensaje: (texto: string) => void;
};

const GodContext = React.createContext<GodContextValue | null>(null);

export function useGod() {
  const ctx = React.useContext(GodContext);
  if (!ctx) throw new Error("useGod debe usarse dentro de <GodProvider />");
  return ctx;
}

export function GodProvider(props: { children: React.ReactNode }) {
  const [abrir, setAbrir] = React.useState(false);
  const [mensajeInicial, setMensajeInicial] = React.useState<string | null>(null);

  const abrirConMensaje = React.useCallback((texto: string) => {
    const limpio = texto.trim();
    if (!limpio) return;
    setMensajeInicial(limpio);
    setAbrir(true);
  }, []);

  return (
    <GodContext.Provider value={{ abrir, setAbrir, abrirConMensaje }}>
      {props.children}
      <GodFab onClick={() => setAbrir(true)} />
      <GodSheet open={abrir} onOpenChange={setAbrir} mensajeInicial={mensajeInicial} onConsumedMensajeInicial={() => setMensajeInicial(null)} />
    </GodContext.Provider>
  );
}

