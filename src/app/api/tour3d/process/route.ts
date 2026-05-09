import { NextResponse } from "next/server";
import { z } from "zod";
import { buildTourWorkerPayload } from "@/lib/tour3d/job-contract";
import type { TourUploadedAsset } from "@/types/tour3d";

const fileMetadataSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  size: z.number().nonnegative(),
});

const assetSchema = z.object({
  id: z.string().min(1),
  url: z.string().url(),
  pathname: z.string().min(1),
  contentType: z.string().min(1),
  size: z.number().nonnegative(),
  originalName: z.string().min(1),
  source: z.enum(["blob-client-upload", "local-demo"]),
});

const schema = z.object({
  files: z.array(fileMetadataSchema).min(1),
  assets: z.array(assetSchema).min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Debes enviar metadata y assets validos del recorrido 3D." },
      { status: 400 },
    );
  }

  const createdAt = new Date().toISOString();
  const jobId = `tour-job-${crypto.randomUUID()}`;
  const assets = parsed.data.assets as TourUploadedAsset[];
  const workerPayload = buildTourWorkerPayload({
    jobId,
    createdAt,
    assets,
  });

  return NextResponse.json({
    success: true,
    job: {
      id: jobId,
      status: "ready_for_gpu",
      createdAt,
      assetCount: assets.length,
      workerPayload,
    },
    tour: {
      id: `demo-tour-${jobId}`,
      status: "completed",
      viewerUrl: assets[0]?.url || "/",
      createdAt,
      previewUrl: assets[0]?.url || undefined,
      previewType: assets[0]?.contentType || undefined,
      previewName: assets[0]?.originalName || undefined,
      assets,
    },
  });
}
