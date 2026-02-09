"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

async function crearSesion() {
  const res = await fetch("/api/chat/session", { method: "POST" });
  return res.json().catch(() => ({}));
}

export function HomeAiChat() {
  const [texto, setTexto] = React.useState("");
  const [msgs, setMsgs] = React.useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Soy God. Describe qué alojamiento buscas (ciudad, fechas, huéspedes, presupuesto, amenities) y te guío usando el catálogo real.",
    },
  ]);
  const [conectando, setConectando] = React.useState(false);
  const [sessionChecked, setSessionChecked] = React.useState(false);

  const ensureSession = React.useCallback(async () => {
    if (sessionChecked) return;
    setConectando(true);
    try {
      const data = await crearSesion();
      if (data?.ok === false) {
        toast("Para usar el chat, necesitas iniciar sesión.", {
          description: "Accede o crea tu cuenta para continuar.",
        });
      }
    } finally {
      setConectando(false);
      setSessionChecked(true);
    }
  }, [sessionChecked]);

  const enviar = async () => {
    const limpio = texto.trim();
    if (!limpio) return;
    setTexto("");
    await ensureSession();

    setMsgs((m) => [...m, { role: "user", content: limpio }]);
    setMsgs((m) => [
      ...m,
      {
        role: "assistant",
        content:
          "MVP: el chat todavía es placeholder. Mientras tanto puedes filtrar propiedades en /search o, si eres ADMIN/ROOT, gestionar el catálogo en /admin.",
      },
    ]);
  };

  return (
    <section className="mt-6 sm:mt-8">
      <div className="grid gap-3">
        <div>
          <h2 className="font-[var(--font-display)] text-2xl tracking-tight text-foreground">
            Búsqueda con IA
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Escribe como si fuera un chat. No inventamos precios ni propiedades.
          </p>
        </div>

        <div className="rounded-3xl border bg-white/85 p-5 shadow-suave">
          <div className="space-y-3">
            <div className="flex max-h-[320px] flex-col gap-3 overflow-auto rounded-2xl bg-secondary/50 p-4">
              {msgs.map((m, idx) => (
                <div
                  key={idx}
                  className={[
                    "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6",
                    m.role === "user"
                      ? "ml-auto bg-marca-petroleo text-white"
                      : "mr-auto border bg-white text-foreground",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              ))}
            </div>

            <Separator />

            <div className="grid gap-2">
              <label className="text-sm font-medium" htmlFor="home-ai">
                Tu solicitud
              </label>
              <Textarea
                id="home-ai"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Ej: Apartamento para 4 personas, 2 noches en la playa, con vista al mar en Tucacas"
                rows={3}
              />
              <div className="flex items-center justify-between gap-2">
                <Button type="button" variant="outline" onClick={() => setTexto("")}>
                  Limpiar
                </Button>
                <Button type="button" variant="brand" onClick={enviar}>
                  Enviar
                </Button>
              </div>
              {conectando ? (
                <div className="text-xs text-muted-foreground">Conectando…</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

