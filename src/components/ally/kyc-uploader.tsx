"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { labelKycStatus } from "@/lib/labels";

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
  { value: "CEDULA", label: "Cédula" },
  { value: "RIF", label: "RIF" },
  { value: "SELFIE_CEDULA", label: "Selfie con cédula" },
  { value: "PROPIEDAD_O_PODER", label: "Documento de propiedad o poder" },
];

export function AllyKycUploader(props: { allyProfileId: string; docs: KycDoc[] }) {
  const [docs, setDocs] = React.useState<KycDoc[]>(props.docs);
  const [tipo, setTipo] = React.useState<KycDoc["type"]>("CEDULA");
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
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
        toast("Se subió a Blob pero no se pudo registrar en la base de datos.", {
          description: crData?.message || "",
        });
        return;
      }

      toast("Documento cargado. Queda pendiente de revisión.");
      setDocs((d) => [
        ...d,
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
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    if (doc.status !== "PENDING") {
      toast("Solo puedes eliminar documentos pendientes.");
      return;
    }
    const ok = confirm("¿Eliminar este documento?");
    if (!ok) return;

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
    setDocs((d) => d.filter((x) => x.id !== id));
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
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="archivo">Archivo</Label>
            <Input
              id="archivo"
              type="file"
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
          Se sube a Vercel Blob. En MVP, los blobs son públicos por URL; evita compartir
          enlaces. TODO: URLs firmadas/privadas.
        </p>
      </div>

      <div className="grid gap-4">
        {docs.length === 0 ? (
          <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
            Aún no has subido documentos.
          </div>
        ) : (
          docs
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((d) => (
              <div key={d.id} className="rounded-2xl border bg-white/85 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground">
                      {TIPOS.find((t) => t.value === d.type)?.label || d.type}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Estado:{" "}
                      <span className="font-medium text-foreground">
                        {labelKycStatus(d.status)}
                      </span>
                    </div>
                    {d.notasAdmin ? (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Nota admin: {d.notasAdmin}
                      </div>
                    ) : null}
                    <div className="mt-2 truncate text-xs text-muted-foreground">
                      {d.pathname}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <a
                      className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary"
                      href={d.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ver
                    </a>
                    <Button type="button" variant="outline" onClick={() => void eliminar(d.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
                {d.url.match(/\.(png|jpg|jpeg|webp|gif)$/i) ? (
                  <div className="mt-3 relative aspect-[16/9] overflow-hidden rounded-xl border bg-secondary/40">
                    <Image src={d.url} alt="Vista previa" fill className="object-cover" />
                  </div>
                ) : null}
              </div>
            ))
        )}
      </div>
    </div>
  );
}
