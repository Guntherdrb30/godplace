import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date() },
    { url: `${base}/search`, lastModified: new Date() },
    { url: `${base}/terminos`, lastModified: new Date() },
    { url: `${base}/privacidad`, lastModified: new Date() },
  ];

  if (!process.env.DATABASE_URL) {
    // Permite `next build` local sin DB configurada.
    return staticRoutes;
  }

  let props: Array<{ id: string; updatedAt: Date }> = [];
  try {
    props = await prisma.property.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, updatedAt: true },
      take: 5000,
    });
  } catch {
    return staticRoutes;
  }

  const propertyRoutes: MetadataRoute.Sitemap = props.map((p) => ({
    url: `${base}/property/${p.id}`,
    lastModified: p.updatedAt,
  }));

  return [...staticRoutes, ...propertyRoutes];
}
