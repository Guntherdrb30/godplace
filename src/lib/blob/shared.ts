export const BLOB_FOLDERS = [
  "properties",
  "property_contracts",
  "kyc",
  "ally_contracts",
  "site",
] as const;

export type BlobFolder = (typeof BLOB_FOLDERS)[number];

const SENSITIVE_BLOB_FOLDERS = new Set<BlobFolder>([
  "property_contracts",
  "kyc",
  "ally_contracts",
]);

export function isSensitiveBlobFolder(folder: BlobFolder): boolean {
  return SENSITIVE_BLOB_FOLDERS.has(folder);
}

export function normalizeBlobPathname(urlOrPathname: string): string {
  const value = urlOrPathname.trim();
  if (!value) return "";

  if (value.startsWith("http://") || value.startsWith("https://")) {
    try {
      return new URL(value).pathname.replace(/^\/+/, "");
    } catch {
      return value.replace(/^\/+/, "");
    }
  }

  return value.replace(/^\/+/, "");
}

export function parseBlobPathname(pathname: string): {
  folder: BlobFolder;
  entityId: string;
  fileName: string;
} | null {
  const normalized = normalizeBlobPathname(pathname);
  const [folder, entityId, ...rest] = normalized.split("/");
  if (!folder || !entityId || rest.length < 1) return null;
  if (!BLOB_FOLDERS.includes(folder as BlobFolder)) return null;

  return {
    folder: folder as BlobFolder,
    entityId,
    fileName: rest.join("/"),
  };
}

export function buildProtectedBlobUrl(pathname: string, options?: { download?: boolean }) {
  const normalized = normalizeBlobPathname(pathname);
  const params = new URLSearchParams({ pathname: normalized });
  if (options?.download) params.set("download", "1");
  return `/api/blob/read?${params.toString()}`;
}

export function isBlobImagePathname(pathname: string) {
  return /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(pathname);
}
