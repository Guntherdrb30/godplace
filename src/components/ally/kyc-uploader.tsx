"use client";

import React from "react";
import { toast } from "sonner";
import { buildProtectedBlobUrl, isBlobImagePathname } from "@/lib/blob/shared";
import { labelKycStatus } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type KycDoc = {
  id: string;
  type: "CEDULA" | "RIF" | "SELFIE_CEDULA" | "PROPIEDAD_O_PODER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  url: string;
  pathname: string;
  notasAdmin: string | null;
  createdAt: string;
};

const TIPOS: Array<{ value: KycDoc["type"]; label: string }> = [
  { value: "CEDULA", label: "Cedula" },
  { value: "RIF", label: "RIF" },
  { value: "SELFIE_CEDULA", label: "Selfie con cedula" },
  { value: "PROPIEDAD_O_PODER", label: "Documento de propiedad o poder" },
];

export function AllyKycUploader(props: { allyProfileId: string; docs: KycDoc[] }) {
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  const [docs, setDocs] = React.useState<KycDoc[]>(props.docs);
  const [tipo, setTipo] = React.useState<KycDoc["type"]>("CEDULA");
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast("Documento demasiado grande.", {
        description: "Usa un PDF o imagen menor a 4MB para evitar errores de subida.",
      });
      return;
    }

    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "kyc");
      fd.set("entityId", props.allyProfileId);

      const up = await fetch("/api/blob/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        toast("No se pudo subir el documento.", { description: upData?.message || "" });
        return;
      }

      const cr = await fetch("/api/ally/kyc_documents/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type: tipo,
          url: upData.url,
          pathname: upData.pathname,
        }),
      });
      const crData = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        toast("Se subio a Blob pero no se pudo registrar en la base de datos.", {
          description: crData?.message || "",
        });
        return;
      }

      toast("Documento cargado. Queda pendiente de revision.");
      setDocs((current) => [
        ...current,
        {
          id: crData.id,
          type: tipo,
          status: "PENDING",
          url: upData.url,
          pathname: upData.pathname,
          notasAdmin: null,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (id: string) => {
    const doc = docs.find((item) => item.id === id);
    if (!doc) return;
    if (doc.status !== "PENDING") {
      toast("Solo puedes eliminar documentos pendientes.");
      return;
    }
    if (!confirm("Eliminar este documento?")) return;

    const res = await fetch("/api/ally/kyc_documents/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
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

    setDocs((current) => current.filter((item) => item.id !== id));
    toast("Documento eliminado.");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white/80 p-5 shadow-suave">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr] sm:items-end">
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo de documento</Label>
            <select
              id="tipo"
              className="h-10 rounded-md border bg-white px-3 text-sm"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as KycDoc["type"])}
            >
              {TIPOS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="archivo">Archivo</Label>
            <Input
              id="archivo"
              type="file"
              accept="application/pdf,image/*"
              disabled={subiendo}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void subir(file);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Los documentos se almacenan cifrados y solo pueden abrirse desde una sesion autorizada.
        </p>
      </div>

      <div className="grid gap-4">
        {docs.length === 0 ? (
          <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
            Aun no has subido documentos.
          </div>
        ) : (
          docs
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((doc) => (
              <div key={doc.id} className="rounded-2xl border bg-white/85 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {TIPOS.find((item) => item.value === doc.type)?.label || doc.type}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Estado: <span className="font-medium text-foreground">{labelKycStatus(doc.status)}</span>
                    </div>
                    {doc.notasAdmin ? (
                      <div className="mt-2 text-xs text-muted-foreground">Nota admin: {doc.notasAdmin}</div>
                    ) : null}
                    <div className="mt-2 truncate text-xs text-muted-foreground">{doc.pathname}</div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary"
                      href={buildProtectedBlobUrl(doc.pathname)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver
                    </a>
                    <Button type="button" variant="outline" onClick={() => void eliminar(doc.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
                {isBlobImagePathname(doc.pathname) ? (
                  <div className="mt-3 aspect-[16/9] overflow-hidden rounded-xl border bg-secondary/40">
                    {/* next/image no aplica bien aqui porque la previsualizacion depende de cookies de sesion. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildProtectedBlobUrl(doc.pathname)}
                      alt="Vista previa"
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ) : null}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
