import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cotizarReserva } from "@/lib/pricing";

const schema = z.object({
  propertyId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().min(1).max(50),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const p = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    select: {
      id: true,
      status: true,
      currency: true,
      pricePerNightCents: true,
      huespedesMax: true,
    },
  });
  if (!p || p.status !== "PUBLISHED") {
    return NextResponse.json({ ok: false, message: "Propiedad no encontrada." }, { status: 404 });
  }
  if (parsed.data.guests > p.huespedesMax) {
    return NextResponse.json({ ok: false, message: "Excede el máximo de huéspedes." }, { status: 400 });
  }

  const checkIn = new Date(parsed.data.checkIn);
  const checkOut = new Date(parsed.data.checkOut);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) {
    return NextResponse.json({ ok: false, message: "Fechas inválidas." }, { status: 400 });
  }

  const quote = await cotizarReserva({
    pricePerNightCents: p.pricePerNightCents,
    currency: p.currency,
    checkIn,
    checkOut,
    guests: parsed.data.guests,
  });
  if (quote.nights <= 0) {
    return NextResponse.json({ ok: false, message: "Rango de fechas inválido." }, { status: 400 });
  }

  return NextResponse.json({ ok: true, ...quote });
}

