import type { BookingStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type AvailabilityDb = Prisma.TransactionClient | typeof prisma;

const BLOCKING_BOOKING_STATUSES: BookingStatus[] = ["CONFIRMED", "COMPLETED"];

export type AvailabilityConflict =
  | {
      type: "manual_block";
      message: string;
      desde: Date;
      hasta: Date;
      motivo: string | null;
    }
  | {
      type: "booking";
      message: string;
      bookingId: string;
      status: BookingStatus;
      checkIn: Date;
      checkOut: Date;
    };

export async function findAvailabilityConflict(
  db: AvailabilityDb,
  input: {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    ignoreBookingId?: string;
  },
): Promise<AvailabilityConflict | null> {
  const manualBlock = await db.availability.findFirst({
    where: {
      propertyId: input.propertyId,
      desde: { lt: input.checkOut },
      hasta: { gt: input.checkIn },
    },
    orderBy: { desde: "asc" },
  });
  if (manualBlock) {
    return {
      type: "manual_block",
      message: "La propiedad no esta disponible en esas fechas.",
      desde: manualBlock.desde,
      hasta: manualBlock.hasta,
      motivo: manualBlock.motivo || null,
    };
  }

  const bookingConflict = await db.booking.findFirst({
    where: {
      propertyId: input.propertyId,
      status: { in: BLOCKING_BOOKING_STATUSES },
      checkIn: { lt: input.checkOut },
      checkOut: { gt: input.checkIn },
      ...(input.ignoreBookingId ? { id: { not: input.ignoreBookingId } } : {}),
    },
    orderBy: { checkIn: "asc" },
  });
  if (bookingConflict) {
    return {
      type: "booking",
      message: "Ya existe una reserva confirmada para esas fechas.",
      bookingId: bookingConflict.id,
      status: bookingConflict.status,
      checkIn: bookingConflict.checkIn,
      checkOut: bookingConflict.checkOut,
    };
  }

  return null;
}
