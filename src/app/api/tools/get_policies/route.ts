import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  topic: z.string().trim().min(1).max(80),
});

const POLICIES: Record<string, { titulo: string; contenido: string }> = {
  kyc: {
    titulo: "Política de verificación (KYC)",
    contenido:
      "MVP: Se solicitan cédula, RIF, selfie con cédula y documento de propiedad/poder. Admin/Root aprueban o rechazan con notas. TODO: formalizar política completa.",
  },
  reservas: {
    titulo: "Política de reservas",
    contenido:
      "MVP: Reservas por rango de fechas (check-in/out), cálculo de noches y snapshot de pricing en Booking. TODO: reglas de cancelación, reembolsos y penalidades.",
  },
  pagos: {
    titulo: "Política de pagos",
    contenido:
      "MVP: Payments/Payouts son placeholders (TODO). El total y split se calculan y se guardan como snapshot, pero no hay cobro real todavía.",
  },
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "topic inválido." }, { status: 400 });
  }
  const key = parsed.data.topic.toLowerCase();
  const p = POLICIES[key];
  if (!p) {
    return NextResponse.json({ ok: false, message: "Política no encontrada." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, ...p });
}

