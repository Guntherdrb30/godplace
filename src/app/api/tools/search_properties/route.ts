import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { ListingOperationType, PropertyType } from "@prisma/client";

const schema = z
  .object({
    ciudad: z.string().trim().max(80).optional(),
    huespedes: z.number().int().min(1).max(50).optional(),
    operationType: z.enum(["SALE","SHORT_RENT","LONG_RENT","COMMERCIAL_RENT"]).optional(),
    propertyType: z.enum(["HOUSE","APARTMENT","TOWNHOUSE","LAND","OFFICE","COMMERCIAL","WAREHOUSE","BUILDING","FARM","HOTEL","VACATION","OTHER"]).optional(),
    limit: z.number().int().min(1).max(60).optional(),
  })
  .default({});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Filtros inválidos." }, { status: 400 });
  }

  const { ciudad, huespedes, operationType, propertyType, limit } = parsed.data;

  const listings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      ...(operationType ? { operationType: operationType as ListingOperationType } : {}),
      tenant: { is: { status: "ACTIVE" } },
      property: {
        status: "PUBLISHED",
        ...(ciudad ? { ciudad: { contains: ciudad, mode: "insensitive" } } : {}),
        ...(huespedes ? { huespedesMax: { gte: huespedes } } : {}),
        ...(propertyType ? { propertyType: propertyType as PropertyType } : {}),
      },
    },
    include: {
      tenant: { select: { name: true } },
      property: { include: { images: { orderBy: { orden: "asc" }, take: 1 } } },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit || 12,
  });

  return NextResponse.json({
    ok: true,
    listings: listings.map((listing) => ({
      listingId: listing.id,
      propertyId: listing.property.id,
      title: listing.title,
      ciudad: listing.property.ciudad,
      estadoRegion: listing.property.estadoRegion,
      huespedesMax: listing.property.huespedesMax,
      propertyType: listing.property.propertyType,
      operationType: listing.operationType,
      currency: listing.currency,
      priceCents: listing.priceCents,
      agencyName: listing.tenant.name,
      imageUrl: listing.property.images[0]?.url ?? null,
      url: `/property/${listing.property.id}?listing=${listing.id}`,
    })),
  });
}

