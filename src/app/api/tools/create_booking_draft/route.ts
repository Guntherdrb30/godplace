import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { registrarAuditoria } from "@/lib/audit";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAvailabilityConflict } from "@/lib/booking-availability";
import { prisma } from "@/lib/prisma";
import { cotizarReserva } from "@/lib/pricing";

const schema = z.object({
  propertyId: z.string().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  guests: z.number().int().min(1).max(50),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { ok: false, message: "Debes iniciar sesion para reservar." },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, message: "Datos invalidos." }, { status: 400 });
    }

    const property = await prisma.property.findUnique({
      where: { id: parsed.data.propertyId },
      select: {
        id: true,
        tenantId: true,
        status: true,
        currency: true,
        pricePerNightCents: true,
        huespedesMax: true,
        assignedAgentProfileId: true,
        listings: {
          where: { status: "PUBLISHED", operationType: "SHORT_RENT" },
          select: { id: true, assignedAgentProfileId: true },
          take: 1,
        },
      },
    });
    if (!property || property.status !== "PUBLISHED") {
      return NextResponse.json({ ok: false, message: "Propiedad no encontrada." }, { status: 404 });
    }
    if (parsed.data.guests > property.huespedesMax) {
      return NextResponse.json({ ok: false, message: "Excede el maximo de huespedes." }, { status: 400 });
    }

    const checkIn = new Date(parsed.data.checkIn);
    const checkOut = new Date(parsed.data.checkOut);
    if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) {
      return NextResponse.json({ ok: false, message: "Fechas invalidas." }, { status: 400 });
    }

    const quote = await cotizarReserva({
      pricePerNightCents: property.pricePerNightCents,
      currency: property.currency,
      checkIn,
      checkOut,
      guests: parsed.data.guests,
    });
    if (quote.nights <= 0) {
      return NextResponse.json({ ok: false, message: "Rango de fechas invalido." }, { status: 400 });
    }

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await findAvailabilityConflict(tx, {
        propertyId: property.id,
        checkIn,
        checkOut,
      });
      if (conflict) {
        throw new Error(conflict.message);
      }

      const booking = await tx.booking.create({
        data: {
          tenantId: property.tenantId,
          status: "DRAFT",
          propertyId: property.id,
          userId: user.id,
          checkIn,
          checkOut,
          guests: parsed.data.guests,
          nights: quote.nights,
          currency: quote.currency,
          pricePerNightCents: quote.pricePerNightCents,
          subtotalCents: quote.subtotalCents,
          platformFeeCents: quote.platformFeeCents,
          allyEarningsCents: quote.allyEarningsCents,
          totalCents: quote.totalCents,
          snapshot: quote.snapshot as Prisma.InputJsonValue,
        },
      });

      const shortRentListing = property.listings[0] ?? null;
      let assignedAgentProfileId =
        shortRentListing?.assignedAgentProfileId ||
        property.assignedAgentProfileId ||
        null;

      if (!assignedAgentProfileId) {
        const fallbackAgent = await tx.agentProfile.findFirst({
          where: { tenantId: property.tenantId, isActive: true },
          select: { id: true },
          orderBy: { createdAt: "asc" },
        });
        assignedAgentProfileId = fallbackAgent?.id ?? null;
      }

      const existingLead = await tx.lead.findFirst({
        where: {
          tenantId: property.tenantId,
          propertyId: property.id,
          email: user.email,
          stage: { notIn: ["WON", "LOST"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (existingLead) {
        await tx.lead.update({
          where: { id: existingLead.id },
          data: {
            listingId: shortRentListing?.id ?? existingLead.listingId,
            assignedAgentProfileId:
              existingLead.assignedAgentProfileId || assignedAgentProfileId,
            source: existingLead.source || "BOOKING",
            stage:
              existingLead.stage === "NEW"
                ? "QUALIFIED"
                : existingLead.stage,
            priority: "HIGH",
            notes: existingLead.notes
              ? `${existingLead.notes}\nReserva borrador ${booking.id}: ${parsed.data.checkIn} → ${parsed.data.checkOut}, ${parsed.data.guests} huésped(es).`
              : `Reserva borrador ${booking.id}: ${parsed.data.checkIn} → ${parsed.data.checkOut}, ${parsed.data.guests} huésped(es).`,
            lastContactAt: new Date(),
          },
        });
      } else {
        await tx.lead.create({
          data: {
            tenantId: property.tenantId,
            listingId: shortRentListing?.id ?? null,
            propertyId: property.id,
            assignedAgentProfileId,
            name: user.nombre || user.email,
            email: user.email,
            source: "BOOKING",
            stage: "QUALIFIED",
            priority: "HIGH",
            notes: `Reserva borrador ${booking.id}: ${parsed.data.checkIn} → ${parsed.data.checkOut}, ${parsed.data.guests} huésped(es).`,
            lastContactAt: new Date(),
          },
        });
      }

      return booking;
    });

    await registrarAuditoria({
      tenantId: property.tenantId,
      actorUserId: user.id,
      accion: "booking.create_draft",
      entidadTipo: "booking",
      entidadId: booking.id,
      metadata: { propertyId: property.id },
    });

    return NextResponse.json({ ok: true, bookingId: booking.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear la reserva.";
    const status = message.includes("reserva confirmada") || message.includes("no esta disponible") ? 409 : 500;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
