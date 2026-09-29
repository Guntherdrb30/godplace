import { NextResponse } from "next/server";
import { z } from "zod";
import { findAvailabilityConflict } from "@/lib/booking-availability";
import { prisma } from "@/lib/prisma";
import { cotizarReserva } from "@/lib/pricing";

const schema = z.object({
  propertyId: z.string().min(1),
  listingId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().min(1).max(50),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos invalidos." }, { status: 400 });
  }

  const listing = await prisma.listing.findFirst({
    where: {
      id: parsed.data.listingId,
      propertyId: parsed.data.propertyId,
      status: "PUBLISHED",
      operationType: "SHORT_RENT",
      tenant: { is: { status: "ACTIVE" } },
      property: { status: "PUBLISHED" },
    },
    include: {
      property: {
        select: { id: true, huespedesMax: true },
      },
    },
  });
  if (!listing) {
    return NextResponse.json({ ok: false, message: "Propiedad no encontrada." }, { status: 404 });
  }
  if (parsed.data.guests > listing.property.huespedesMax) {
    return NextResponse.json({ ok: false, message: "Excede el maximo de huespedes." }, { status: 400 });
  }

  const checkIn = new Date(parsed.data.checkIn);
  const checkOut = new Date(parsed.data.checkOut);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) {
    return NextResponse.json({ ok: false, message: "Fechas invalidas." }, { status: 400 });
  }

  const quote = await cotizarReserva({
    pricePerNightCents: listing.priceCents,
    currency: listing.currency,
    checkIn,
    checkOut,
    guests: parsed.data.guests,
  });
  if (quote.nights <= 0) {
    return NextResponse.json({ ok: false, message: "Rango de fechas invalido." }, { status: 400 });
  }

  const conflict = await findAvailabilityConflict(prisma, {
    propertyId: listing.property.id,
    checkIn,
    checkOut,
  });
  if (conflict) {
    return NextResponse.json({ ok: false, message: conflict.message }, { status: 409 });
  }

  return NextResponse.json({ ok: true, ...quote });
}
