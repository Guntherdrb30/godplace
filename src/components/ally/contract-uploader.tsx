"use client";

import * as React from "react";
import { toast } from "sonner";
import { buildProtectedBlobUrl } from "@/lib/blob/shared";
import { labelKycStatus } from "@/lib/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  const [contract, setContract] = React.useState<AllyContract | null>(props.contract);
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast("Contrato demasiado grande.", {
        description: "Usa un PDF o imagen menor a 4MB para evitar errores de subida.",
      });
      return;
    }

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
        toast("Se subio a Blob pero no se pudo registrar en la base de datos.", {
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

      toast("Contrato cargado. Queda pendiente de revision.");
      setContract({
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
    if (!contract) return;
    if (contract.status !== "PENDING") {
      toast("Solo puedes eliminar contratos pendientes.");
      return;
    }
    if (!confirm("Eliminar el contrato cargado?")) return;

    const res = await fetch("/api/ally/contract/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: contract.id }),
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

    setContract(null);
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
            disabled={subiendo || contract?.status === "APPROVED"}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void subir(file);
              e.currentTarget.value = "";
            }}
          />
          <p className="text-xs text-muted-foreground">
            Formatos sugeridos: PDF o imagen. Luego de subir el contrato firmado, queda en revision por Godplaces.
          </p>
        </div>
      </div>

      {!contract ? (
        <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
          Aun no has subido tu contrato firmado.
        </div>
      ) : (
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="text-sm text-muted-foreground">
                Estado:{" "}
                <Badge
                  variant={
                    contract.status === "APPROVED"
                      ? "default"
                      : contract.status === "REJECTED"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {labelKycStatus(contract.status)}
                </Badge>
              </div>
              {contract.notasAdmin ? (
                <div className="mt-2 text-xs text-muted-foreground">Nota admin: {contract.notasAdmin}</div>
              ) : null}
              <div className="mt-2 truncate text-xs text-muted-foreground">{contract.pathname}</div>
            </div>
            <div className="flex gap-2">
              <a
                className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary"
                href={buildProtectedBlobUrl(contract.pathname)}
                target="_blank"
                rel="noreferrer"
              >
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
