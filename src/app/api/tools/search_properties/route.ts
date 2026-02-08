import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z
  .object({
    ciudad: z.string().trim().max(80).optional(),
    huespedes: z.number().int().min(1).max(50).optional(),
    limit: z.number().int().min(1).max(60).optional(),
  })
  .default({});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Filtros inválidos." }, { status: 400 });
  }

  const { ciudad, huespedes, limit } = parsed.data;

  const props = await prisma.property.findMany({
    where: {
      status: "PUBLISHED",
      ...(ciudad ? { ciudad: { contains: ciudad, mode: "insensitive" } } : {}),
      ...(huespedes ? { huespedesMax: { gte: huespedes } } : {}),
    },
    include: { images: { orderBy: { orden: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
    take: limit || 12,
  });

  return NextResponse.json({
    ok: true,
    properties: props.map((p) => ({
      id: p.id,
      titulo: p.titulo,
      ciudad: p.ciudad,
      estadoRegion: p.estadoRegion,
      huespedesMax: p.huespedesMax,
      currency: p.currency,
      pricePerNightCents: p.pricePerNightCents,
      imageUrl: p.images[0]?.url ?? null,
    })),
  });
}

