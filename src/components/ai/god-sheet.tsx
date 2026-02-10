"use client";

import React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ChatKitEmbed } from "@/components/ai/chatkit-embed";

type Msg = { role: "user" | "assistant"; content: string };

async function crearSesion() {
  const res = await fetch("/api/chat/session", { method: "POST" });
  return res.json().catch(() => ({}));
}

async function enviarMensaje(input: { message: string; history: Msg[] }) {
  const res = await fetch("/api/chat/message", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo enviar.");
  return data as { ok: true; text: string };
}

export function GodSheet(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mensajeInicial: string | null;
  onConsumedMensajeInicial: () => void;
  branding: {
    brandName: string;
    agentName: string;
    colors: { primaryHsl: string; secondaryHsl: string };
  };
}) {
  const { open, onOpenChange, mensajeInicial, onConsumedMensajeInicial } = props;
  const chatProvider = process.env.NEXT_PUBLIC_CHAT_PROVIDER || "local";
  const usarChatKit = chatProvider === "chatkit";
  const [texto, setTexto] = React.useState("");
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "assistant",
      content: `Soy ${props.branding.agentName}. Cuéntame qué alojamiento buscas (ciudad, fechas, huéspedes, presupuesto) y te muestro opciones reales del catálogo.`,
    },
  ]);
  const [cargandoSesion, setCargandoSesion] = React.useState(false);
  const [enviando, setEnviando] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setCargandoSesion(true);
    crearSesion()
      .then((data) => {
        if (data?.ok === false) {
          toast(`Para usar ${props.branding.agentName}, necesitas iniciar sesión.`, {
            description: "Accede o crea tu cuenta para continuar.",
          });
        }
      })
      .finally(() => setCargandoSesion(false));
  }, [open, props.branding.agentName]);

  React.useEffect(() => {
    if (!open) return;
    if (usarChatKit) return;
    if (!mensajeInicial) return;
    const msg = mensajeInicial.trim();
    onConsumedMensajeInicial();
    if (!msg) return;
    setTexto(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, mensajeInicial, onConsumedMensajeInicial, usarChatKit]);

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setTexto("");

    const history = msgs.slice(-18);
    setMsgs((m) => [...m, { role: "user", content: limpio }]);
    setEnviando(true);
    try {
      const data = await enviarMensaje({ message: limpio, history });
      setMsgs((m) => [...m, { role: "assistant", content: data.text }]);
    } catch (e) {
      toast("No se pudo responder.", { description: e instanceof Error ? e.message : "" });
      setMsgs((m) => [
        ...m,
        { role: "assistant", content: "Lo siento, no pude responder en este momento. Intenta nuevamente." },
      ]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>
            {props.branding.agentName} — Asistente de {props.branding.brandName}.
          </SheetTitle>
          <SheetDescription>Operado por Trends172Tech.com</SheetDescription>
        </SheetHeader>

        <Separator className="my-4" />

        {usarChatKit ? (
          <div className="h-[74vh] overflow-hidden rounded-xl border bg-white">
            <ChatKitEmbed
              className="h-full w-full"
              branding={props.branding}
              mensajeInicial={open ? mensajeInicial : null}
              onConsumedMensajeInicial={() => {
                onConsumedMensajeInicial();
                setTexto("");
              }}
            />
          </div>
        ) : (
          <>
            <div className="flex h-[70vh] flex-col gap-3 overflow-auto rounded-xl bg-secondary/60 p-3">
              {msgs.map((m, idx) => (
                <div
                  key={idx}
                  className={[
                    "max-w-[92%] rounded-xl px-3 py-2 text-sm leading-6",
                    m.role === "user"
                      ? "ml-auto bg-marca-petroleo text-white"
                      : "mr-auto bg-white text-foreground border",
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
                <Button type="button" variant="brand" onClick={enviar} disabled={enviando}>
                  Enviar
                </Button>
              </div>
              {cargandoSesion ? (
                <div className="text-xs text-muted-foreground">Conectando…</div>
              ) : null}
              {enviando ? <div className="text-xs text-muted-foreground">Pensando…</div> : null}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
