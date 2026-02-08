import { prisma } from "@/lib/prisma";

export type QuoteInput = {
  pricePerNightCents: number;
  currency: string;
  checkIn: Date;
  checkOut: Date;
  guests: number;
};

export function calcularNoches(checkIn: Date, checkOut: Date): number {
  const ms = checkOut.getTime() - checkIn.getTime();
  const nights = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

export async function obtenerPlatformFeeRate(): Promise<number> {
  const s = await prisma.systemSetting.findUnique({
    where: { key: "platform_fee_rate" },
  });
  const n = typeof s?.value === "number" ? (s.value as number) : 0.12;
  return Math.min(Math.max(n, 0), 0.5);
}

export async function cotizarReserva(input: QuoteInput) {
  const nights = calcularNoches(input.checkIn, input.checkOut);
  const subtotalCents = input.pricePerNightCents * nights;
  const platformFeeRate = await obtenerPlatformFeeRate();
  const platformFeeCents = Math.round(subtotalCents * platformFeeRate);
  const allyEarningsCents = subtotalCents - platformFeeCents;
  const totalCents = subtotalCents;

  return {
    nights,
    currency: input.currency,
    pricePerNightCents: input.pricePerNightCents,
    subtotalCents,
    platformFeeCents,
    allyEarningsCents,
    totalCents,
    snapshot: {
      nights,
      pricePerNightCents: input.pricePerNightCents,
      platformFeeRate,
      subtotalCents,
      platformFeeCents,
      allyEarningsCents,
      totalCents,
      guests: input.guests,
      checkIn: input.checkIn.toISOString(),
      checkOut: input.checkOut.toISOString(),
    },
  };
}

