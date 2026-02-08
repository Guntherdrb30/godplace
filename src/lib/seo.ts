import type { Metadata } from "next";

export const SITE_NAME = "Godplaces.";
export const SITE_DESCRIPTION =
  "Alquiler temporal en Venezuela con verificacion de aliados y soporte centralizado.";

export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "");
  if (explicit) return explicit;

  // Vercel exposes `VERCEL_URL` as a hostname (no protocol). Use it as a sensible default
  // for previews/production when `NEXT_PUBLIC_SITE_URL` is not configured.
  const vercelUrlRaw = process.env.VERCEL_URL?.trim();
  if (vercelUrlRaw) {
    const vercelUrl = vercelUrlRaw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

export function buildMetadata(input?: {
  title?: string;
  description?: string;
  path?: string;
}): Metadata {
  const title = input?.title ? `${input.title} | ${SITE_NAME}` : SITE_NAME;
  const description = input?.description || SITE_DESCRIPTION;
  const url = new URL(input?.path || "/", siteUrl()).toString();

  return {
    title,
    description,
    metadataBase: new URL(siteUrl()),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "es_VE",
      type: "website",
      images: [{ url: "/opengraph-image" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image"],
    },
  };
}
