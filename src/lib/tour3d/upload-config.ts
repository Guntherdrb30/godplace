export const TOUR_ALLOWED_FILE_TYPES = [
  "video/mp4",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const TOUR_ALLOWED_FILE_ACCEPT = TOUR_ALLOWED_FILE_TYPES.join(",");
export const TOUR_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;
export const TOUR_BLOB_BASE_PATH = "tour3d/demo";

export function isAllowedTourType(type: string) {
  return TOUR_ALLOWED_FILE_TYPES.includes(type as (typeof TOUR_ALLOWED_FILE_TYPES)[number]);
}

export function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 MB";
  const mb = size / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(mb >= 100 ? 0 : 1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

export function isAllowedTourFile(file: Pick<File, "type" | "size">) {
  return isAllowedTourType(file.type) && file.size <= TOUR_MAX_FILE_SIZE_BYTES;
}

export function sanitizeTourFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_") || "archivo";
}

export function buildTourBlobPath(sessionId: string, fileName: string) {
  return `${TOUR_BLOB_BASE_PATH}/${sessionId}/${sanitizeTourFileName(fileName)}`;
}

// TODO: Para produccion con videos grandes, conectar Vercel Blob client uploads
// o S3/R2. No subir videos grandes a traves de una API route serverless normal.
