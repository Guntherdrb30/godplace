import type { TourUploadedAsset, TourWorkerPayload } from "@/types/tour3d";

export function buildTourWorkerPayload(input: {
  jobId: string;
  createdAt: string;
  assets: TourUploadedAsset[];
}) : TourWorkerPayload {
  return {
    jobId: input.jobId,
    createdAt: input.createdAt,
    source: "godplaces-tour3d-demo",
    pipeline: {
      trainer: "nerfstudio-splatfacto",
      rasterizer: "gsplat",
      mode: input.assets.some((asset) => asset.contentType.startsWith("video/"))
        ? "video-to-3d-tour"
        : "images-to-3d-tour",
    },
    assets: input.assets.map((asset) => ({
      url: asset.url,
      pathname: asset.pathname,
      contentType: asset.contentType,
      size: asset.size,
      originalName: asset.originalName,
    })),
    output: {
      expectedViewer: "web",
      callbackRoute: "/api/tour3d/process",
    },
  };
}
