import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !user.roles.includes("ALIADO") || !user.allyProfileId) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "50", 10) || 50));

  const wallet = await prisma.allyWallet.upsert({
    where: { allyProfileId: user.allyProfileId },
    update: {},
    create: { allyProfileId: user.allyProfileId },
  });

  const [txs, withdrawals] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.withdrawalRequest.findMany({
      where: { allyProfileId: user.allyProfileId },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    wallet: {
      id: wallet.id,
      allyProfileId: wallet.allyProfileId,
      balanceAvailableCents: wallet.balanceAvailableCents,
      balancePendingCents: wallet.balancePendingCents,
      currency: "USD",
    },
    transactions: txs.map((t) => ({
      id: t.id,
      type: t.type,
      amountCents: t.amountCents,
      currency: t.currency,
      referenceType: t.referenceType,
      referenceId: t.referenceId,
      note: t.note,
      createdAt: t.createdAt.toISOString(),
    })),
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      amountCents: w.amountCents,
      currency: w.currency,
      status: w.status,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
    })),
  });
}

