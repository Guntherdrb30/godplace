"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type SiteBrandingEditable = {
  brandName: string;
  agentName: string;
  logoUrl: string;
  logoPathname: string | null;
  colors: { primaryHsl: string; secondaryHsl: string };
};

async function subirLogo(file: File) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", "site");
  fd.set("entityId", "branding");
  const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo subir el archivo.");
  return data as { ok: true; url: string; pathname: string };
}

async function guardarBranding(payload: Partial<SiteBrandingEditable>) {
  const res = await fetch("/api/root/site_branding/update", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");
  return data as { ok: true };
}

export function SiteBrandingForm(props: { initial: SiteBrandingEditable }) {
  const [brandName, setBrandName] = React.useState(props.initial.brandName);
  const [agentName, setAgentName] = React.useState(props.initial.agentName);
  const [primaryHsl, setPrimaryHsl] = React.useState(props.initial.colors.primaryHsl);
  const [secondaryHsl, setSecondaryHsl] = React.useState(props.initial.colors.secondaryHsl);
  const [logoUrl, setLogoUrl] = React.useState(props.initial.logoUrl);
  const [logoPathname, setLogoPathname] = React.useState<string | null>(props.initial.logoPathname);
  const [file, setFile] = React.useState<File | null>(null);
  const [guardando, setGuardando] = React.useState(false);

  const onGuardar = async () => {
    setGuardando(true);
    try {
      let nextLogoUrl = logoUrl;
      let nextLogoPathname = logoPathname;

      if (file) {
        const up = await subirLogo(file);
        nextLogoUrl = up.url;
        nextLogoPathname = up.pathname;
        setLogoUrl(nextLogoUrl);
        setLogoPathname(nextLogoPathname);
        setFile(null);
      }

      await guardarBranding({
        brandName,
        agentName,
        logoUrl: nextLogoUrl,
        logoPathname: nextLogoPathname,
        colors: { primaryHsl, secondaryHsl },
      });
      toast("Branding actualizado.", { description: "Refresca la página para ver todo aplicado." });
    } catch (e) {
      toast("No se pudo guardar.", { description: e instanceof Error ? e.message : "" });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
      <CardHeader>
        <CardTitle>Branding (solo ROOT)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-2xl gap-5">
          <div className="grid gap-2">
            <Label htmlFor="brandName">Nombre de marca</Label>
            <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={guardando} />
            <p className="text-xs text-muted-foreground">Se usa en header/footer y en textos principales.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="agentName">Nombre del agente</Label>
            <Input id="agentName" value={agentName} onChange={(e) => setAgentName(e.target.value)} disabled={guardando} />
            <p className="text-xs text-muted-foreground">Ej: God, Nova, Luna, etc.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="primaryHsl">Color primario (H S% L%)</Label>
              <Input
                id="primaryHsl"
                value={primaryHsl}
                onChange={(e) => setPrimaryHsl(e.target.value)}
                disabled={guardando}
                placeholder="176 57% 45%"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secondaryHsl">Color secundario (H S% L%)</Label>
              <Input
                id="secondaryHsl"
                value={secondaryHsl}
                onChange={(e) => setSecondaryHsl(e.target.value)}
                disabled={guardando}
                placeholder="188 100% 17%"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="logoFile">Logo (header)</Label>
            <Input
              id="logoFile"
              type="file"
              accept="image/*"
              disabled={guardando}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <p className="text-xs text-muted-foreground">
              Se sube a Vercel Blob. Recomendado: PNG/SVG, fondo transparente.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="brand" onClick={onGuardar} disabled={guardando}>
              {guardando ? "Guardando…" : "Guardar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={guardando}
              onClick={() => {
                setBrandName(props.initial.brandName);
                setAgentName(props.initial.agentName);
                setPrimaryHsl(props.initial.colors.primaryHsl);
                setSecondaryHsl(props.initial.colors.secondaryHsl);
                setLogoUrl(props.initial.logoUrl);
                setLogoPathname(props.initial.logoPathname);
                setFile(null);
              }}
            >
              Revertir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

