"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function GodReservaModal(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (texto: string) => void;
  agentName: string;
}) {
  const { open, onOpenChange, onSubmit } = props;
  const [texto, setTexto] = React.useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTexto("");
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Reserva con Inteligencia Artificial</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            const limpio = texto.trim();
            if (!limpio) return;
            onSubmit(limpio);
          }}
        >
          <label htmlFor="god-reserva" className="text-sm font-medium">
            Describe tu reserva
          </label>
          <Textarea
            id="god-reserva"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={5}
            placeholder="Ej: Casa con piscina para 6 personas, 3 noches en Mérida, cerca del centro"
          />

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" variant="brand">
              Iniciar con {props.agentName || "God"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
