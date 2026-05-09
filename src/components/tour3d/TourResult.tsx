"use client";

import { ArrowRight, Boxes, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { TourResult as TourResultType } from "@/types/tour3d";

export function TourResult(props: {
  result: TourResultType;
  onReset: () => void;
}) {
  const isVideo = props.result.previewType?.startsWith("video/") ?? false;
  const canOpenPreview = Boolean(props.result.previewUrl || props.result.viewerUrl);
  const openUrl = props.result.previewUrl || props.result.viewerUrl;

  return (
    <div className="rounded-[2rem] border bg-white/90 p-6 shadow-suave sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-[var(--font-display)] text-3xl tracking-tight text-foreground">
              Recorrido 3D generado
            </h3>
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
              Demo
            </Badge>
          </div>

          <p className="max-w-2xl text-sm leading-7 text-muted-foreground">
            Esta es una simulacion preparada para conectar Gaussian Splatting, Nerfstudio,
            gsplat, Luma AI o un worker GPU.
          </p>

          <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-muted-foreground">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <span className="font-medium text-foreground">ID:</span> {props.result.id}
              </div>
              <div>
                <span className="font-medium text-foreground">Creado:</span>{" "}
                {new Date(props.result.createdAt).toLocaleString("es-VE")}
              </div>
              {props.result.job ? (
                <>
                  <div>
                    <span className="font-medium text-foreground">Job GPU:</span> {props.result.job.id}
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Assets:</span>{" "}
                    {props.result.job.assetCount}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              variant="brand"
              disabled={!canOpenPreview}
              onClick={() => {
                if (!openUrl) return;
                window.open(openUrl, "_blank", "noopener,noreferrer");
              }}
            >
              Ver recorrido
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button type="button" variant="outline" onClick={props.onReset}>
              <RotateCcw className="h-4 w-4" />
              Procesar otro archivo
            </Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[1.75rem] border border-slate-800 bg-slate-950 p-5 text-white shadow-[0_24px_70px_rgba(15,23,42,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--marca-turquesa)/0.35),transparent_45%),radial-gradient(circle_at_bottom_right,hsl(var(--marca-petroleo)/0.55),transparent_40%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.14)_1px,transparent_1px)] [background-size:32px_32px]" />

          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <Badge variant="secondary" className="bg-white/10 text-white">
                <Sparkles className="mr-1 h-3.5 w-3.5" />
                Viewer Demo
              </Badge>
              <Boxes className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur">
              {props.result.previewUrl ? (
                <div className="space-y-4">
                  <div className="overflow-hidden rounded-[1.25rem] border border-white/15 bg-black/30">
                    {isVideo ? (
                      <video
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        className="max-h-[420px] min-h-[280px] w-full object-cover"
                        src={props.result.previewUrl}
                      />
                    ) : (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={props.result.previewUrl}
                          alt={props.result.previewName || "Vista previa del recorrido 3D"}
                          className="max-h-[420px] min-h-[280px] w-full object-cover"
                        />
                      </>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/75">
                    Vista demo renderizada a partir del archivo cargado:{" "}
                    <span className="font-medium text-white">
                      {props.result.previewName || "archivo procesado"}
                    </span>
                  </div>

                  {props.result.job ? (
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
                      Contrato de job preparado para worker GPU con pipeline{" "}
                      <span className="font-medium">
                        {props.result.job.workerPayload.pipeline.trainer}
                      </span>{" "}
                      +{" "}
                      <span className="font-medium">
                        {props.result.job.workerPayload.pipeline.rasterizer}
                      </span>
                      .
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-white/20 bg-black/20 text-center">
                  <div className="mb-4 h-20 w-20 rounded-full bg-white/10 shadow-[0_0_60px_rgba(45,212,191,0.28)]" />
                  <p className="font-[var(--font-display)] text-2xl tracking-tight">
                    Vista previa del recorrido 3D
                  </p>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
                    Panel visual placeholder para conectar luego un viewer real con splats,
                    malla reconstruida o escena inmersiva.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
