export type TourProcessingStep =
  | "idle"
  | "validating"
  | "uploading"
  | "analyzing"
  | "generating"
  | "preparing"
  | "completed"
  | "error";

export type TourUploadFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  previewUrl: string;
  file: File;
};

export type TourUploadedAsset = {
  id: string;
  url: string;
  pathname: string;
  contentType: string;
  size: number;
  originalName: string;
  source: "blob-client-upload" | "local-demo";
};

export type TourWorkerPayload = {
  jobId: string;
  createdAt: string;
  source: "godplaces-tour3d-demo";
  pipeline: {
    trainer: "nerfstudio-splatfacto";
    rasterizer: "gsplat";
    mode: "video-to-3d-tour" | "images-to-3d-tour";
  };
  assets: Array<{
    url: string;
    pathname: string;
    contentType: string;
    size: number;
    originalName: string;
  }>;
  output: {
    expectedViewer: "web";
    callbackRoute: string;
  };
};

export type TourJob = {
  id: string;
  status: "ready_for_gpu" | "failed";
  createdAt: string;
  assetCount: number;
  workerPayload: TourWorkerPayload;
};

export type TourResult = {
  id: string;
  status: "completed" | "failed";
  viewerUrl: string;
  createdAt: string;
  previewUrl?: string;
  previewType?: string;
  previewName?: string;
  assets?: TourUploadedAsset[];
  job?: TourJob;
};
