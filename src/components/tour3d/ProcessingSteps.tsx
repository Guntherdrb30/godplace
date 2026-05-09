"use client";

import { CheckCircle2, LoaderCircle } from "lucide-react";
import type { TourProcessingStep } from "@/types/tour3d";

const STEP_ORDER = [
  "validating",
  "uploading",
  "analyzing",
  "generating",
  "preparing",
  "completed",
 ] as const;

type RenderableTourStep = (typeof STEP_ORDER)[number];

const STEP_LABELS: Record<RenderableTourStep, string> = {
  validating: "Validando archivos",
  uploading: "Subiendo archivo",
  analyzing: "Analizando propiedad",
  generating: "Generando escena 3D",
  preparing: "Preparando vista previa",
  completed: "Recorrido completado",
};

export function ProcessingSteps(props: {
  currentStep: TourProcessingStep;
}) {
  const currentIndex = STEP_ORDER.indexOf(props.currentStep as (typeof STEP_ORDER)[number]);

  return (
    <div className="rounded-3xl border bg-white/85 p-5 shadow-suave">
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground">Estado del procesamiento</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta demo simula el pipeline visual antes de conectar Blob y un worker GPU.
        </p>
      </div>

      <div className="space-y-3">
        {STEP_ORDER.map((step, index) => {
          const isCompleted = props.currentStep === "completed" || (currentIndex > -1 && index < currentIndex);
          const isActive = props.currentStep !== "completed" && step === props.currentStep;

          return (
            <div
              key={step}
              className={[
                "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                isActive
                  ? "border-brand-primary/30 bg-brand-primary/10"
                  : isCompleted
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-slate-200 bg-slate-50/80",
              ].join(" ")}
            >
              <div
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border",
                  isActive
                    ? "border-brand-primary/40 bg-white text-brand-primary"
                    : isCompleted
                      ? "border-emerald-300 bg-white text-emerald-600"
                      : "border-slate-200 bg-white text-slate-400",
                ].join(" ")}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4.5 w-4.5" />
                ) : isActive ? (
                  <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>

              <div>
                <p className="font-medium text-foreground">{STEP_LABELS[step]}</p>
                <p className="text-xs text-muted-foreground">
                  {isCompleted
                    ? "Paso completado."
                    : isActive
                      ? "Procesando ahora."
                      : "Pendiente."}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
