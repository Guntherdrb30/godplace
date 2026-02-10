"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PROPERTY_CONTRACT_TERMS_VERSION } from "@/lib/legal";

export function PropertyContractUploader(props: {
  propertyId: string;
  url: string | null;
  pathname: string | null;
  acceptedAt: string | null;
  termsVersion: string | null;
  disabled?: boolean;
}) {
  const [url, setUrl] = React.useState<string | null>(props.url);
  const [pathname, setPathname] = React.useState<string | null>(props.pathname);
  const [acceptedAt, setAcceptedAt] = React.useState<string | null>(props.acceptedAt);
  const [termsVersion, setTermsVersion] = React.useState<string | null>(props.termsVersion);
  const [accepted, setAccepted] = React.useState(
    !!props.acceptedAt && props.termsVersion === PROPERTY_CONTRACT_TERMS_VERSION,
  );
  const [subiendo, setSubiendo] = React.useState(false);

  const acceptedRecorded = !!acceptedAt && termsVersion === PROPERTY_CONTRACT_TERMS_VERSION;

  const guardarAceptacion = async () => {
    if (!accepted) return;
    if (!url || !pathname) return;
    setSubiendo(true);
    try {
      const res = await fetch("/api/ally/property_contract/accept_terms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ propertyId: props.propertyId, acceptedTerms: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo guardar la aceptación.", { description: data?.message || "" });
        return;
      }
      setAcceptedAt(data?.ownershipContractAcceptedAt || null);
      setTermsVersion(data?.ownershipContractTermsVersion || null);
      toast("Aceptación guardada.");
    } finally {
      setSubiendo(false);
    }
  };

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
          acceptedTerms: accepted,
        }),
      });
      const crData = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        toast("Se subió a Blob pero no se pudo registrar en la base de datos.", {
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
      setAcceptedAt(crData?.ownershipContractAcceptedAt || null);
      setTermsVersion(crData?.ownershipContractTermsVersion || null);
      toast("Contrato cargado.");
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async () => {
    const ok = confirm("¿Eliminar el contrato de propiedad?");
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
    setAcceptedAt(null);
    setTermsVersion(null);
    setAccepted(false);
    toast("Contrato eliminado.");
  };

  const disabled = !!props.disabled || subiendo;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border bg-white p-4 text-sm text-muted-foreground">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4"
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            disabled={disabled}
          />
          <span className="leading-6">
            Declaro que tengo autorización legal para publicar esta propiedad y{" "}
            <a className="underline" href="/terminos" target="_blank" rel="noreferrer">
              acepto los Términos y Condiciones
            </a>{" "}
            (versión {PROPERTY_CONTRACT_TERMS_VERSION}).
          </span>
        </label>
        {!acceptedRecorded && url ? (
          <div className="mt-3 flex justify-end">
            <Button type="button" variant="brand" size="sm" onClick={() => void guardarAceptacion()} disabled={disabled || !accepted}>
              Guardar aceptación
            </Button>
          </div>
        ) : null}
        {acceptedAt ? (
          <div className="mt-2 text-xs text-muted-foreground">
            Aceptado:{" "}
            <span className="font-medium text-foreground">
              {new Date(acceptedAt).toLocaleString("es-VE")}
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="prop-contract">Contrato de propiedad (obligatorio)</Label>
        <Input
          id="prop-contract"
          type="file"
          accept="application/pdf,image/*"
          disabled={disabled || !accepted}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
            e.currentTarget.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">PDF o imagen. Es requisito para enviar la propiedad a revisión.</p>
      </div>

      {!url ? (
        <div className="rounded-2xl border bg-white/70 p-4 text-sm text-muted-foreground">
          Aún no has subido el contrato de la propiedad.
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
