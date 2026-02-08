import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  propertyId: z.string().min(1),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "propertyId inválido." }, { status: 400 });
  }

  const p = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    include: {
      images: { orderBy: { orden: "asc" } },
      amenities: { include: { amenity: true } },
    },
  });
  if (!p || p.status !== "PUBLISHED") {
    return NextResponse.json({ ok: false, message: "Propiedad no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    property: {
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      ciudad: p.ciudad,
      estadoRegion: p.estadoRegion,
      huespedesMax: p.huespedesMax,
      habitaciones: p.habitaciones,
      camas: p.camas,
      banos: p.banos,
      currency: p.currency,
      pricePerNightCents: p.pricePerNightCents,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt, orden: i.orden })),
      amenities: p.amenities.map((pa) => ({ slug: pa.amenity.slug, nombre: pa.amenity.nombre })),
    },
  });
}

