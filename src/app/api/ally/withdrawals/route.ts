import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { financeEmail, sendEmail } from "@/lib/email";

const schema = z.object({
  amountUsd: z.number().finite(),
});

function usdToCents(usd: number): number {
  // MVP: entrada en number; redondeamos a centavos.
  return Math.round(usd * 100);
}

function maskFromLast4(last4: string): string {
  return `****${last4}`;
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const amountCents = usdToCents(parsed.data.amountUsd);
  if (amountCents < 10000) {
    return NextResponse.json({ ok: false, message: "El retiro mínimo es 100 USD." }, { status: 400 });
  }

  const ally = await prisma.allyProfile.findUnique({
    where: { id: user.allyProfileId },
    include: { user: true },
  });
  if (!ally) return NextResponse.json({ ok: false, message: "No existe el perfil de aliado." }, { status: 404 });
  if (ally.status !== "KYC_APPROVED") {
    return NextResponse.json({ ok: false, message: "Tu perfil debe estar aprobado (KYC) para retirar." }, { status: 400 });
  }

  const bankName = ally.bankName?.trim() || "";
  const bankAccountLast4 = ally.bankAccountLast4?.trim() || "";
  const accountHolderName = ally.bankAccountHolderName?.trim() || "";
  const holderId = ally.bankHolderId?.trim() || "";
  if (!bankName || !bankAccountLast4 || bankAccountLast4.length < 4 || !accountHolderName || !holderId) {
    return NextResponse.json(
      { ok: false, message: "Faltan datos bancarios del perfil. Completa tu información antes de retirar." },
      { status: 400 },
    );
  }

  const wallet = await prisma.allyWallet.upsert({
    where: { allyProfileId: ally.id },
    update: {},
    create: { allyProfileId: ally.id },
  });

  if (amountCents > wallet.balanceAvailableCents) {
    return NextResponse.json({ ok: false, message: "Saldo insuficiente." }, { status: 400 });
  }

  const reqRetiro = await prisma.withdrawalRequest.create({
    data: {
      allyProfileId: ally.id,
      amountCents,
      currency: "USD",
      status: "PENDING",
      bankName,
      bankAccountLast4,
      bankAccountMasked: maskFromLast4(bankAccountLast4.slice(-4)),
      accountHolderName,
      holderId,
      requestedByUserId: user.id,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "withdrawal_request.create",
    entidadTipo: "withdrawal_request",
    entidadId: reqRetiro.id,
    metadata: {
      amountCents,
      currency: "USD",
      bankName,
      bankAccountLast4: bankAccountLast4.slice(-4),
    },
  });

  const to = financeEmail();
  if (to) {
    const subject = "Nueva solicitud de retiro — Godplaces.";
    const text = [
      "Nueva solicitud de retiro (MVP)",
      "",
      `Solicitud: ${reqRetiro.id}`,
      `Aliado: ${ally.user.email}`,
      `Monto: USD ${(amountCents / 100).toFixed(2)}`,
      `Banco: ${bankName}`,
      `Cuenta: ${reqRetiro.bankAccountMasked}`,
      `Titular: ${accountHolderName}`,
      `Cédula/RIF: ${holderId}`,
      `Fecha: ${reqRetiro.createdAt.toISOString()}`,
      "",
      "Godplaces. — Desarrollado y operado por Trends172Tech.com",
    ].join("\n");
    await sendEmail({ to, subject, text }).catch((e) => {
      console.warn("[EMAIL][WARN] Falló envío de email de retiro:", e);
    });
  } else {
    console.warn("[EMAIL][TODO] Configura FINANCE_EMAIL para notificar retiros.");
  }

  return NextResponse.json({
    ok: true,
    withdrawal: {
      id: reqRetiro.id,
      amountCents: reqRetiro.amountCents,
      currency: reqRetiro.currency,
      status: reqRetiro.status,
      createdAt: reqRetiro.createdAt.toISOString(),
    },
  });
}

