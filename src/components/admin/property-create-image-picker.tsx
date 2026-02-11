"use client";

import React from "react";
import Image from "next/image";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 6;

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  id?: string;
  name?: string;
  className?: string;
};

export function PropertyCreateImagePicker({
  id = "imagenes",
  name = "imagenes",
  className,
}: Props) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = React.useState<File[]>([]);
  const [warning, setWarning] = React.useState<string | null>(null);

  const previews = React.useMemo(
    () =>
      files.map((file, index) => ({
        key: `${file.name}-${file.size}-${index}`,
        file,
        url: URL.createObjectURL(file),
      })),
    [files]
  );

  React.useEffect(() => {
    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [previews]);

  const syncInputFiles = React.useCallback((nextFiles: File[]) => {
    if (!inputRef.current) return;
    const dt = new DataTransfer();
    nextFiles.forEach((file) => dt.items.add(file));
    inputRef.current.files = dt.files;
  }, []);

  const onChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(event.currentTarget.files || []);
      if (selected.length <= MAX_IMAGES) {
        setWarning(null);
        setFiles(selected);
        return;
      }

      const limited = selected.slice(0, MAX_IMAGES);
      const dt = new DataTransfer();
      limited.forEach((file) => dt.items.add(file));
      event.currentTarget.files = dt.files;

      setWarning(`Solo se tomaran las primeras ${MAX_IMAGES} imagenes.`);
      setFiles(limited);
    },
    []
  );

  const removeAt = React.useCallback(
    (index: number) => {
      const next = files.filter((_, i) => i !== index);
      setFiles(next);
      if (next.length < MAX_IMAGES) setWarning(null);
      syncInputFiles(next);
    },
    [files, syncInputFiles]
  );

  return (
    <div className={cn("grid gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id}>Imagenes de la propiedad</Label>
        <span className="rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground">
          {files.length}/{MAX_IMAGES}
        </span>
      </div>

      <div className="rounded-2xl border border-dashed bg-secondary/30 p-4">
        <div className="mb-3 flex items-start gap-3">
          <div className="rounded-xl bg-white p-2 text-brand-secondary shadow-sm">
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          </div>
          <div className="text-xs text-muted-foreground">
            Sube hasta {MAX_IMAGES} imagenes (JPG/PNG/WebP). Se guardaran al crear la propiedad y puedes editarlas
            despues.
          </div>
        </div>

        <Input
          ref={inputRef}
          id={id}
          name={name}
          type="file"
          accept="image/*"
          multiple
          onChange={onChange}
          className="h-auto cursor-pointer bg-white py-2"
        />
        {warning ? <p className="mt-2 text-xs text-amber-700">{warning}</p> : null}
      </div>

      {previews.length === 0 ? (
        <div className="rounded-2xl border bg-white/70 p-4 text-xs text-muted-foreground">
          Aun no hay imagenes seleccionadas.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {previews.map((item, index) => (
            <div key={item.key} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="relative aspect-[4/3] bg-secondary/40">
                <Image src={item.url} alt={item.file.name} fill unoptimized className="object-cover" />
              </div>
              <div className="space-y-2 p-3">
                <div className="truncate text-sm font-medium">{item.file.name}</div>
                <div className="text-xs text-muted-foreground">{formatBytes(item.file.size)}</div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => removeAt(index)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Quitar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
