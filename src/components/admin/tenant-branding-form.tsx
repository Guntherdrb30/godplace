"use client";

import React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type TenantBranding = {
  id: string;
  name: string;
  legalName: string | null;
  logoUrl: string | null;
  logoPathname: string | null;
  primaryHsl: string | null;
  secondaryHsl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  websiteUrl: string | null;
};

async function uploadLogo(file: File, tenantId: string) {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("folder", "site");
  fd.set("entityId", tenantId);
  const res = await fetch("/api/blob/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || "No se pudo subir el logo.");
  return data as { url: string; pathname: string };
}

export function TenantBrandingForm(props: { initial: TenantBranding }) {
  const [state, setState] = React.useState(props.initial);
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);

  const set = (key: keyof TenantBranding, value: string | null) =>
    setState((current) => ({ ...current, [key]: value }));

  async function save() {
    setSaving(true);
    try {
      let logoUrl = state.logoUrl;
      let logoPathname = state.logoPathname;

      if (file) {
        const uploaded = await uploadLogo(file, state.id);
        logoUrl = uploaded.url;
        logoPathname = uploaded.pathname;
      }

      const res = await fetch("/api/admin/tenant_branding/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: state.name,
          legalName: state.legalName || "",
          logoUrl: logoUrl || "",
          logoPathname: logoPathname || "",
          primaryHsl: state.primaryHsl || "",
          secondaryHsl: state.secondaryHsl || "",
          contactEmail: state.contactEmail || "",
          contactPhone: state.contactPhone || "",
          contactWhatsapp: state.contactWhatsapp || "",
          websiteUrl: state.websiteUrl || "",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo guardar.");

      setState((current) => ({ ...current, logoUrl, logoPathname }));
      setFile(null);
      toast("Identidad actualizada.", {
        description: "Las publicaciones de esta inmobiliaria usarán estos datos.",
      });
    } catch (error) {
      toast("No se pudo guardar.", {
        description: error instanceof Error ? error.message : "Error inesperado.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
      <CardHeader>
        <CardTitle>Identidad de la inmobiliaria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-3xl gap-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="tenantName">Nombre comercial</Label>
              <Input id="tenantName" value={state.name} onChange={(e) => set("name", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="legalName">Razón social</Label>
              <Input id="legalName" value={state.legalName || ""} onChange={(e) => set("legalName", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="tenantLogo">Logo</Label>
            <Input id="tenantLogo" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <p className="text-xs text-muted-foreground">PNG, JPG, WebP o SVG. Fondo transparente recomendado.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="primaryHsl">Color principal</Label>
              <Input id="primaryHsl" value={state.primaryHsl || ""} onChange={(e) => set("primaryHsl", e.target.value)} placeholder="221 83% 53%" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="secondaryHsl">Color secundario</Label>
              <Input id="secondaryHsl" value={state.secondaryHsl || ""} onChange={(e) => set("secondaryHsl", e.target.value)} placeholder="222 47% 16%" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contactEmail">Email</Label>
              <Input id="contactEmail" type="email" value={state.contactEmail || ""} onChange={(e) => set("contactEmail", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactPhone">Teléfono</Label>
              <Input id="contactPhone" value={state.contactPhone || ""} onChange={(e) => set("contactPhone", e.target.value)} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="contactWhatsapp">WhatsApp</Label>
              <Input id="contactWhatsapp" value={state.contactWhatsapp || ""} onChange={(e) => set("contactWhatsapp", e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="websiteUrl">Sitio web</Label>
              <Input id="websiteUrl" value={state.websiteUrl || ""} onChange={(e) => set("websiteUrl", e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <Button type="button" variant="brand" onClick={save} disabled={saving}>
            {saving ? "Guardando..." : "Guardar identidad"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
