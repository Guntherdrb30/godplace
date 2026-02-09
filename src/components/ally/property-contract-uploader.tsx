"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PropertyContractUploader(props: {
  propertyId: string;
  url: string | null;
  pathname: string | null;
  disabled?: boolean;
}) {
  const [url, setUrl] = React.useState<string | null>(props.url);
  const [pathname, setPathname] = React.useState<string | null>(props.pathname);
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "property_contracts");
      fd.set("entityId", props.propertyId);

      const up = await fetch("/api/blob/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        toast("No se pudo subir el contrato.", { description: upData?.message || "" });
        return;
      }

      const cr = await fetch("/api/ally/property_contract/upsert", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: props.propertyId,
          url: upData.url,
          pathname: upData.pathname,
        }),
      });
      const crData = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        toast("Se subiÃ³ a Blob pero no se pudo registrar en la base de datos.", {
          description: crData?.message || "",
        });
        return;
      }

      if (crData?.prevPathname) {
        await fetch("/api/blob/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urlOrPathname: crData.prevPathname }),
        }).catch(() => {});
      }

      setUrl(upData.url);
      setPathname(upData.pathname);
      toast("Contrato cargado.");
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async () => {
    const ok = confirm("Â¿Eliminar el contrato de propiedad?");
    if (!ok) return;

    const res = await fetch("/api/ally/property_contract/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ propertyId: props.propertyId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast("No se pudo eliminar.", { description: data?.message || "" });
      return;
    }

    if (data?.pathname) {
      await fetch("/api/blob/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urlOrPathname: data.pathname }),
      }).catch(() => {});
    }

    setUrl(null);
    setPathname(null);
    toast("Contrato eliminado.");
  };

  const disabled = !!props.disabled || subiendo;

  return (
    <div className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="prop-contract">Contrato de propiedad (obligatorio)</Label>
        <Input
          id="prop-contract"
          type="file"
          accept="application/pdf,image/*"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
            e.currentTarget.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">PDF o imagen. Es requisito para enviar la propiedad a revisiÃ³n.</p>
      </div>

      {!url ? (
        <div className="rounded-2xl border bg-white/70 p-4 text-sm text-muted-foreground">
          AÃºn no has subido el contrato de la propiedad.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="truncate text-xs text-muted-foreground">{pathname}</div>
            </div>
            <div className="flex gap-2">
              <a className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary" href={url} target="_blank" rel="noreferrer">
                Ver
              </a>
              <Button type="button" variant="outline" size="sm" onClick={() => void eliminar()} disabled={disabled}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

