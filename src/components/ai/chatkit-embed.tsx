"use client";

import React from "react";
import { toast } from "sonner";

type ChatKitElement = HTMLElement & {
  setOptions: (options: unknown) => void;
  setComposerValue?: (args: { text: string }) => void;
  focusComposer?: () => void;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function hslToHex(h: number, s: number, l: number) {
  const hh = ((h % 360) + 360) % 360;
  const ss = clamp01(s / 100);
  const ll = clamp01(l / 100);

  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (value: number) => {
    const normalized = Math.round((value + m) * 255);
    return normalized.toString(16).padStart(2, "0");
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslTokenToHex(token: string) {
  const parts = token.trim().split(/\s+/);
  if (parts.length !== 3) return "#0ea5a5";
  const h = Number(parts[0]);
  const s = Number(parts[1].replace("%", ""));
  const l = Number(parts[2].replace("%", ""));
  if (![h, s, l].every((value) => Number.isFinite(value))) return "#0ea5a5";
  return hslToHex(h, s, l);
}

async function getClientSecret() {
  const res = await fetch("/api/chatkit/session", { method: "POST" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo crear la sesion.");
  if (!data?.client_secret) throw new Error("Respuesta invalida del servidor.");
  return String(data.client_secret);
}

export function ChatKitEmbed(props: {
  className?: string;
  branding: {
    brandName: string;
    agentName: string;
    colors: { primaryHsl: string; secondaryHsl: string };
  };
  mensajeInicial?: string | null;
  onConsumedMensajeInicial?: () => void;
}) {
  const { branding, className, mensajeInicial, onConsumedMensajeInicial } = props;
  const elRef = React.useRef<ChatKitElement | null>(null);

  const setElementRef = React.useCallback((node: HTMLElement | null) => {
    elRef.current = node as ChatKitElement | null;
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function init() {
      if (typeof window === "undefined") return;
      await customElements.whenDefined("openai-chatkit");
      if (cancelled) return;

      const el = elRef.current;
      if (!el) return;

      const accent = hslTokenToHex(branding.colors.primaryHsl);

      el.setOptions({
        locale: "es-ES",
        api: { getClientSecret },
        theme: {
          colorScheme: "light",
          color: {
            accent: {
              primary: accent,
              level: 2,
            },
          },
          radius: "pill",
          density: "compact",
        },
        startScreen: {
          greeting: `Hola, soy ${branding.agentName}. Que alojamiento buscas hoy?`,
          prompts: [
            "Apartamento para 4 en la playa",
            "Casa con piscina para fin de semana",
            "Cabana romantica 2 personas",
          ],
        },
        composer: {
          placeholder: "Describe tu busqueda (ciudad, fechas, huespedes, presupuesto)...",
        },
      });
    }

    init().catch((error) => {
      toast("No se pudo iniciar el asistente.", {
        description: error instanceof Error ? error.message : "",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [branding.agentName, branding.colors.primaryHsl]);

  React.useEffect(() => {
    const msg = mensajeInicial?.trim();
    if (!msg) return;

    const el = elRef.current;
    if (!el?.setComposerValue) return;

    el.setComposerValue({ text: msg });
    el.focusComposer?.();
    onConsumedMensajeInicial?.();
  }, [mensajeInicial, onConsumedMensajeInicial]);

  return <openai-chatkit ref={setElementRef} className={className} />;
}
