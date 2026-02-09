"use client";

import React from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Img = { id: string; url: string; pathname: string; alt: string | null; orden: number };

export function PropertyImageUploader(props: { propertyId: string; images: Img[] }) {
  const [images, setImages] = React.useState<Img[]>(props.images);
  const [subiendo, setSubiendo] = React.useState(false);

  const subir = async (file: File) => {
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("folder", "properties");
      fd.set("entityId", props.propertyId);

      const up = await fetch("/api/blob/upload", { method: "POST", body: fd });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) {
        toast("No se pudo subir la imagen.", { description: upData?.message || "" });
        return;
      }

      const cr = await fetch("/api/admin/property_images/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: props.propertyId,
          url: upData.url,
          pathname: upData.pathname,
          alt: file.name,
        }),
      });
      const crData = await cr.json().catch(() => ({}));
      if (!cr.ok) {
        toast("Se subió a Blob pero no se pudo registrar en la base de datos.", {
          description: crData?.message || "",
        });
        return;
      }

      toast("Imagen subida.");
      // Recarga liviana: en MVP basta con refrescar lista client-side con datos mínimos.
      setImages((imgs) => [
        ...imgs,
        {
          id: crData.imageId,
          url: upData.url,
          pathname: upData.pathname,
          alt: file.name,
          orden: imgs.length,
        },
      ]);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (imageId: string) => {
    const target = images.find((i) => i.id === imageId);
    if (!target) return;
    const ok = confirm("¿Eliminar esta imagen?");
    if (!ok) return;

    const res = await fetch("/api/admin/property_images/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ imageId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast("No se pudo eliminar.", { description: data?.message || "" });
      return;
    }

    // Intento best-effort de borrar el blob.
    if (data?.pathname) {
      await fetch("/api/blob/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ urlOrPathname: data.pathname }),
      }).catch(() => {});
    }

    setImages((imgs) => imgs.filter((i) => i.id !== imageId));
    toast("Imagen eliminada.");
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="img">Subir imagen</Label>
        <Input
          id="img"
          type="file"
          accept="image/*"
          disabled={subiendo || images.length >= 6}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void subir(file);
            e.currentTarget.value = "";
          }}
        />
        <p className="text-xs text-muted-foreground">
          Máximo 6 imágenes. Se sube a Vercel Blob y se guarda <code>url</code> + <code>pathname</code>.
        </p>
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border bg-white/70 p-6 text-sm text-muted-foreground">
          Sin imágenes todavía.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {images
            .slice()
            .sort((a, b) => a.orden - b.orden)
            .map((img) => (
              <div key={img.id} className="overflow-hidden rounded-2xl border bg-white">
                <div className="relative aspect-[4/3] bg-secondary/40">
                  <Image src={img.url} alt={img.alt || "Imagen de propiedad"} fill className="object-cover" />
                </div>
                <div className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">Orden {img.orden}</div>
                    <div className="truncate text-xs text-muted-foreground">{img.pathname}</div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => void eliminar(img.id)}>
                    Eliminar
                  </Button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
