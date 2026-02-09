"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { labelKycStatus } from "@/lib/labels";

type AllyContract = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  url: string;
  pathname: string;
  notasAdmin: string | null;
};

export function AllyContractUploader(props: {
  allyProfileId: string;
  contract: AllyContract | null;
}) {
  const [c, setC] = React.useState<AllyContract | null>(props.contract);
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "ally_contracts");
      fd.set("entityId", props.allyProfileId);

      const up = await fetch("/api/blob/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        toast("No se pudo subir el contrato.", { description: upData?.message || "" });
        return;
      }

      const cr = await fetch("/api/ally/contract/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: upData.url, pathname: upData.pathname }),
      });
      const crData = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        toast("Se subió a Blob pero no se pudo registrar en la base de datos.", {
          description: crData?.message || "",
        });
        return;
      }

      // Best-effort: eliminar el blob anterior si existía.
      if (crData?.prevPathname) {
        await fetch("/api/blob/delete", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ urlOrPathname: crData.prevPathname }),
        }).catch(() => {});
      }

      toast("Contrato cargado. Queda pendiente de revisión.");
      setC({
        id: crData.id,
        status: "PENDING",
        url: upData.url,
        pathname: upData.pathname,
        notasAdmin: null,
      });
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async () => {
    if (!c) return;
    if (c.status !== "PENDING") {
      toast("Solo puedes eliminar contratos pendientes.");
      return;
    }
    const ok = confirm("¿Eliminar el contrato cargado?");
    if (!ok) return;

    const res = await fetch("/api/ally/contract/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: c.id }),
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

    setC(null);
    toast("Contrato eliminado.");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white/80 p-5 shadow-suave">
        <div className="grid gap-2">
          <Label htmlFor="contract">Subir contrato firmado</Label>
          <Input
            id="contract"
            type="file"
            accept="application/pdf,image/*"
            disabled={subiendo || c?.status === "APPROVED"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subir(file);
              e.currentTarget.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Formatos sugeridos: PDF o imagen. Luego de subir el contrato firmado, queda en revisión por Godplaces.
          </p>
        </div>
      </div>

      {!c ? (
        <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
          Aún no has subido tu contrato firmado.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                Estado:{" "}
                <Badge variant={c.status === "APPROVED" ? "default" : c.status === "REJECTED" ? "destructive" : "secondary"}>
                  {labelKycStatus(c.status)}
                </Badge>
              </div>
              {c.notasAdmin ? (
                <div className="mt-2 text-xs text-muted-foreground">Nota admin: {c.notasAdmin}</div>
              ) : null}
              <div className="mt-2 truncate text-xs text-muted-foreground">{c.pathname}</div>
            </div>
            <div className="flex gap-2">
              <a className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary" href={c.url} target="_blank" rel="noreferrer">
                Ver
              </a>
              <Button type="button" variant="outline" onClick={() => void eliminar()}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

