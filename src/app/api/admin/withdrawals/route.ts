import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { WithdrawalStatus } from "@prisma/client";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  if (!isStaff) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const url = new URL(req.url);
  const status = url.searchParams.get("status")?.trim() || "";
  const valid: WithdrawalStatus[] = ["PENDING", "APPROVED", "REJECTED", "PAID"];
  const where = valid.includes(status as WithdrawalStatus) ? { status: status as WithdrawalStatus } : {};

  const items = await prisma.withdrawalRequest.findMany({
    where,
    include: {
      allyProfile: { include: { user: true } },
      requestedBy: true,
      reviewedBy: true,
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return NextResponse.json({
    ok: true,
    withdrawals: items.map((w) => ({
      id: w.id,
      amountCents: w.amountCents,
      currency: w.currency,
      status: w.status,
      bankName: w.bankName,
      bankAccountMasked: w.bankAccountMasked,
      accountHolderName: w.accountHolderName,
      holderId: w.holderId,
      paymentReference: w.paymentReference,
      receiptUrl: w.receiptUrl,
      rejectionReason: w.rejectionReason,
      createdAt: w.createdAt.toISOString(),
      updatedAt: w.updatedAt.toISOString(),
      ally: {
        id: w.allyProfileId,
        email: w.allyProfile.user.email,
        nombre: w.allyProfile.user.nombre,
      },
      requestedBy: { id: w.requestedByUserId, email: w.requestedBy.email },
      reviewedBy: w.reviewedBy ? { id: w.reviewedBy.id, email: w.reviewedBy.email } : null,
      reviewedAt: w.reviewedAt ? w.reviewedAt.toISOString() : null,
    })),
  });
}
