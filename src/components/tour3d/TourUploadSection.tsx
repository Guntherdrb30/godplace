"use client";

import React from "react";
import { upload } from "@vercel/blob/client";
import { Film, FolderUp, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { FilePreview } from "@/components/tour3d/FilePreview";
import { ProcessingSteps } from "@/components/tour3d/ProcessingSteps";
import { TourResult } from "@/components/tour3d/TourResult";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildTourBlobPath,
  formatFileSize,
  isAllowedTourType,
  TOUR_ALLOWED_FILE_ACCEPT,
  TOUR_MAX_FILE_SIZE_BYTES,
} from "@/lib/tour3d/upload-config";
import type {
  TourProcessingStep,
  TourResult as TourResultType,
  TourUploadFile,
  TourUploadedAsset,
} from "@/types/tour3d";

const SIMULATION_FLOW: TourProcessingStep[] = [
  "validating",
  "uploading",
  "analyzing",
  "generating",
  "preparing",
];

const ALLOWED_TYPES_TEXT = [
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
].join(", ");

function delay(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeFiles(files: File[]) {
  return files.map<TourUploadFile>((file, index) => ({
    id: `${file.name}-${file.size}-${file.lastModified}-${index}`,
    name: file.name,
    type: file.type,
    size: file.size,
    previewUrl: URL.createObjectURL(file),
    file,
  }));
}

function pickPrimaryPreviewFile(files: TourUploadFile[]) {
  return files.find((file) => file.type.startsWith("video/")) || files[0] || null;
}

export function TourUploadSection() {
  const [files, setFiles] = React.useState<TourUploadFile[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [step, setStep] = React.useState<TourProcessingStep>("idle");
  const [dragActive, setDragActive] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [result, setResult] = React.useState<TourResultType | null>(null);
  const [uploadMode, setUploadMode] = React.useState<"blob-client-upload" | "local-demo">("local-demo");

  React.useEffect(() => {
    return () => {
      files.forEach((file) => {
        URL.revokeObjectURL(file.previewUrl);
      });
    };
  }, [files]);

  const replaceFiles = React.useCallback((nextFiles: TourUploadFile[]) => {
    setFiles((current) => {
      current.forEach((file) => URL.revokeObjectURL(file.previewUrl));
      return nextFiles;
    });
  }, []);

  const resetState = React.useCallback(() => {
    setStep("idle");
    setError(null);
    setResult(null);
    setIsProcessing(false);
    setUploadMode("local-demo");
  }, []);

  const clearFiles = React.useCallback(() => {
    replaceFiles([]);
    resetState();
  }, [replaceFiles, resetState]);

  const removeFile = React.useCallback((id: string) => {
    setFiles((current) => {
      const target = current.find((file) => file.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((file) => file.id !== id);
    });
    setResult(null);
    setError(null);
    setStep("idle");
    setUploadMode("local-demo");
  }, []);

  const applyFiles = React.useCallback((fileList: File[]) => {
    setError(null);
    setResult(null);
    setStep("idle");
    setUploadMode("local-demo");

    if (fileList.length === 0) {
      setError("Debes seleccionar al menos un video o imagen.");
      return;
    }

    const invalidByType = fileList.filter((file) => !file.type || !isAllowedTourType(file.type));
    if (invalidByType.length > 0) {
      setError(`Tipo no permitido. Usa solo: ${ALLOWED_TYPES_TEXT}.`);
      return;
    }

    const invalidBySize = fileList.filter((file) => file.size > TOUR_MAX_FILE_SIZE_BYTES);
    if (invalidBySize.length > 0) {
      setError(`Cada archivo debe pesar maximo ${formatFileSize(TOUR_MAX_FILE_SIZE_BYTES)}.`);
      return;
    }

    replaceFiles(normalizeFiles(fileList));
  }, [replaceFiles]);

  const onSelectFiles = React.useCallback((incoming: FileList | null) => {
    if (!incoming) {
      setError("Debes seleccionar al menos un video o imagen.");
      return;
    }
    applyFiles(Array.from(incoming));
  }, [applyFiles]);

  const uploadFilesToBlob = React.useCallback(async (currentFiles: TourUploadFile[]) => {
    const sessionId = crypto.randomUUID();

    const uploadedAssets = await Promise.all(
      currentFiles.map(async (file) => {
        const blob = await upload(buildTourBlobPath(sessionId, file.name), file.file, {
          access: "public",
          handleUploadUrl: "/api/tour3d/upload",
          multipart: file.size > 4.5 * 1024 * 1024,
          clientPayload: JSON.stringify({
            sessionId,
            purpose: "tour3d-demo",
          }),
        });

        return {
          id: file.id,
          url: blob.url,
          pathname: blob.pathname,
          contentType: file.type,
          size: file.size,
          originalName: file.name,
          source: "blob-client-upload",
        } satisfies TourUploadedAsset;
      }),
    );

    return uploadedAssets;
  }, []);

  const buildLocalDemoAssets = React.useCallback((currentFiles: TourUploadFile[]) => {
    return currentFiles.map((file) => ({
      id: file.id,
      url: file.previewUrl,
      pathname: `local-demo/${file.id}/${file.name}`,
      contentType: file.type,
      size: file.size,
      originalName: file.name,
      source: "local-demo",
    } satisfies TourUploadedAsset));
  }, []);

  const runProcessing = React.useCallback(async () => {
    if (files.length === 0) {
      setError("Debes seleccionar al menos un video o imagen.");
      toast("No hay archivos para procesar.");
      return;
    }

    setError(null);
    setResult(null);
    setIsProcessing(true);

    try {
      setStep("validating");
      await delay(500);

      setStep("uploading");
      let assets: TourUploadedAsset[];
      let effectiveUploadMode: "blob-client-upload" | "local-demo" = "blob-client-upload";

      try {
        assets = await uploadFilesToBlob(files);
      } catch (uploadError) {
        effectiveUploadMode = "local-demo";
        assets = buildLocalDemoAssets(files);
        const uploadMessage =
          uploadError instanceof Error
            ? uploadError.message
            : "No se pudo subir a Blob en este entorno.";
        toast("Client upload no disponible, usando demo local.", {
          description: uploadMessage,
        });
        setError(
          `Blob client upload no disponible en este entorno. Se continuo con demo local. Detalle: ${uploadMessage}`,
        );
      }

      setUploadMode(effectiveUploadMode);

      for (const currentStep of SIMULATION_FLOW.slice(2)) {
        setStep(currentStep);
        await delay(currentStep === "generating" ? 1200 : 800);
      }

      const res = await fetch("/api/tour3d/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          files: files.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
          assets,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success || !data?.tour) {
        throw new Error(data?.message || "No se pudo simular el recorrido 3D.");
      }

      await delay(400);
      const previewFile = pickPrimaryPreviewFile(files);
      setResult({
        ...(data.tour as TourResultType),
        previewUrl: data.tour.previewUrl || previewFile?.previewUrl,
        previewType: data.tour.previewType || previewFile?.type,
        previewName: data.tour.previewName || previewFile?.name,
      });
      setStep("completed");
      toast(
        effectiveUploadMode === "blob-client-upload"
          ? "Recorrido 3D demo generado con assets subidos a Blob."
          : "Recorrido 3D demo generado.",
      );
    } catch (processingError) {
      const message =
        processingError instanceof Error ? processingError.message : "Error simulando el proceso.";
      setStep("error");
      setError(message);
      toast("No se pudo generar la demo.", { description: message });
    } finally {
      setIsProcessing(false);
    }
  }, [buildLocalDemoAssets, files, uploadFilesToBlob]);

  return (
    <section id="tour-3d-demo" className="mt-14 scroll-mt-24">
      <div className="relative overflow-hidden rounded-[2rem] border bg-white/90 p-6 shadow-suave sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--marca-turquesa)/0.12),transparent_35%),radial-gradient(circle_at_bottom_right,hsl(var(--marca-petroleo)/0.10),transparent_42%)]" />

        <div className="relative z-10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-4 border border-brand-primary/20 bg-brand-primary/10 text-brand-secondary">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Demo IA 3D
              </Badge>
              <h2 className="font-[var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
                Prueba el recorrido 3D de tu propiedad
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Sube un video o imagenes del inmueble y visualiza como se generaria una
                experiencia interactiva para compradores.
              </p>
            </div>

            <div className="rounded-2xl border bg-slate-950 px-4 py-3 text-sm text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-white/10 p-2">
                  <Wand2 className="h-4 w-4 text-cyan-300" />
                </div>
                <div>
                  <p className="font-medium">Arquitectura preparada</p>
                  <p className="text-xs text-white/65">Blob client upload + GPU worker externo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-6">
              <div
                className={[
                  "rounded-[1.75rem] border-2 border-dashed p-6 transition-colors",
                  dragActive
                    ? "border-brand-primary bg-brand-primary/8"
                    : "border-slate-200 bg-slate-50/80",
                ].join(" ")}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragActive(false);
                  onSelectFiles(event.dataTransfer.files);
                }}
              >
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-2xl bg-white p-3 shadow-sm">
                      <FolderUp className="h-6 w-6 text-brand-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        Arrastra archivos aqui o selecciona desde tu equipo
                      </p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        Permitidos: {ALLOWED_TYPES_TEXT}. Tamano maximo:{" "}
                        {formatFileSize(TOUR_MAX_FILE_SIZE_BYTES)} por archivo.
                      </p>
                    </div>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-secondary">
                    <Film className="h-4 w-4" />
                    Seleccionar archivos
                    <input
                      type="file"
                      accept={TOUR_ALLOWED_FILE_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(event) => {
                        onSelectFiles(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {files.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {files.map((file) => (
                    <FilePreview key={file.id} item={file} onRemove={removeFile} />
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border bg-white/70 p-8 text-sm text-muted-foreground">
                  Aun no hay archivos cargados. Puedes probar con un video corto o varias
                  imagenes del inmueble.
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  type="button"
                  variant="brand"
                  onClick={() => void runProcessing()}
                  disabled={isProcessing}
                >
                  <Sparkles className="h-4 w-4" />
                  Generar recorrido 3D
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFiles}
                  disabled={isProcessing && files.length === 0}
                >
                  Limpiar archivos
                </Button>
              </div>

              {uploadMode === "blob-client-upload" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  Esta demo ya intenta subir los archivos directamente a Blob antes de preparar el job.
                </div>
              ) : null}
            </div>

            <div className="space-y-6">
              <ProcessingSteps currentStep={step} />

              <div className="rounded-3xl border bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.35)]">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-medium">Roadmap tecnico</p>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    Fase 2
                  </Badge>
                </div>
                <ul className="space-y-3 text-sm leading-6 text-white/70">
                  <li>1. Client upload directo a Blob desde navegador.</li>
                  <li>2. Contrato de job listo para worker GPU.</li>
                  <li>3. Envio posterior a cola o broker externo.</li>
                  <li>4. Entrenamiento con Nerfstudio Splatfacto / gsplat.</li>
                  <li>5. Devolucion de viewerUrl real a la propiedad.</li>
                </ul>
              </div>
            </div>
          </div>

          {result ? (
            <div className="mt-8">
              <TourResult
                result={result}
                onReset={() => {
                  clearFiles();
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
