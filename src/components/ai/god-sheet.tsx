"use client";

import React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

async function crearSesion() {
  const res = await fetch("/api/chat/session", { method: "POST" });
  return res.json().catch(() => ({}));
}

export function GodSheet(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mensajeInicial: string | null;
  onConsumedMensajeInicial: () => void;
}) {
  const { open, onOpenChange, mensajeInicial, onConsumedMensajeInicial } = props;
  const [texto, setTexto] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "assistant",
      content: "Soy God. En este MVP el chat es un placeholder. No invento propiedades ni precios: consulto el catálogo real.",
    },
  ]);
  const [cargandoSesion, setCargandoSesion] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCargandoSesion(true);
    crearSesion()
      .then((data) => {
        if (data?.ok === false) {
          toast("Para usar God, necesitas iniciar sesión.", {
            description: "Accede o crea tu cuenta para continuar.",
          });
        }
      })
      .finally(() => setCargandoSesion(false));
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    if (!mensajeInicial) return;
    const msg = mensajeInicial.trim();
    onConsumedMensajeInicial();
    if (!msg) return;
    setTexto(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, mensajeInicial, onConsumedMensajeInicial]);

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setTexto("");
    setMsgs((m) => [...m, { role: "user", content: limpio }]);
    setMsgs((m) => [
      ...m,
      {
        role: "assistant",
        content:
          "Gracias. MVP: aún no está conectado el chat real. Mientras tanto, puedes usar /search o (si eres ADMIN/ROOT) gestionar el catálogo en /admin.",
      },
    ]);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>God — Asistente de Godplaces.</SheetTitle>
          <SheetDescription>Operado por Trends172Tech.com</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        <div className="flex h-[70vh] flex-col gap-3 overflow-auto rounded-xl bg-secondary/60 p-3">
          {msgs.map((m, idx) => (
            <div
              key={idx}
              className={[
                "max-w-[92%] rounded-xl px-3 py-2 text-sm leading-6",
                m.role === "user" ? "ml-auto bg-marca-petroleo text-white" : "mr-auto bg-white text-foreground border",
              ].join(" ")}
            >
              {m.content}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-2">
          <label className="text-sm font-medium" htmlFor="god-input">
            Escribe tu solicitud
          </label>
          <Textarea
            id="god-input"
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Cuéntanos cómo quieres hospedarte… Ej: ‘Apartamento para 4 personas, 2 noches en la playa, con vista al mar en Tucacas’"
            rows={3}
          />
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="outline" onClick={() => setTexto("")}>
              Limpiar
            </Button>
            <Button type="button" className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]" onClick={enviar}>
              Enviar
            </Button>
          </div>
          {cargandoSesion ? <div className="text-xs text-muted-foreground">Conectando…</div> : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

