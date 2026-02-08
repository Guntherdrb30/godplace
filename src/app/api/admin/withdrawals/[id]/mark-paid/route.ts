import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

function safeFilename(name: string): string {
  return (name || "comprobante").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  const isStaff = !!actor && (actor.roles.includes("ADMIN") || actor.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const { id } = await ctx.params;

  let paymentReference: string | null = null;
  let receiptUrl: string | null = null;
  let receiptPathname: string | null = null;

  const ct = req.headers.get("content-type") || "";
  if (ct.includes("multipart/form-data")) {
    const form = await req.formData();
    paymentReference = String(form.get("paymentReference") || "").trim() || null;
    const receiptFile = form.get("receiptFile");
    if (receiptFile instanceof File) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ ok: false, message: "Blob no configurado." }, { status: 500 });
      }
      const pathname = `withdrawals/${id}/${safeFilename(receiptFile.name)}`;
      const res = await put(pathname, receiptFile, {
        access: "public",
        addRandomSuffix: true,
        contentType: receiptFile.type || undefined,
      });
      receiptUrl = res.url;
      receiptPathname = res.pathname;
    }
  } else {
    const body = await req.json().catch(() => ({}));
    paymentReference = typeof body?.paymentReference === "string" ? body.paymentReference.trim() || null : null;
  }

  const result = await prisma.$transaction(async (tx) => {
    const w = await tx.withdrawalRequest.findUnique({
      where: { id },
      select: { id: true, status: true, amountCents: true, currency: true, allyProfileId: true },
    });
    if (!w) {
      return { ok: false as const, status: 404, message: "No existe." };
    }
    if (w.status !== "APPROVED") {
      return { ok: false as const, status: 400, message: "Solo puedes marcar como pagado si está APROBADO." };
    }

    const wallet = await tx.allyWallet.upsert({
      where: { allyProfileId: w.allyProfileId },
      update: {},
      create: { allyProfileId: w.allyProfileId },
    });

    if (wallet.balanceAvailableCents < w.amountCents) {
      return { ok: false as const, status: 400, message: "Saldo insuficiente en la billetera del aliado." };
    }

    await tx.allyWallet.update({
      where: { id: wallet.id },
      data: {
        balanceAvailableCents: { decrement: w.amountCents },
      },
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "WITHDRAWAL",
        amountCents: -w.amountCents,
        currency: w.currency,
        referenceType: "WITHDRAWAL",
        referenceId: w.id,
        note: paymentReference || undefined,
      },
    });

    await tx.withdrawalRequest.update({
      where: { id: w.id },
      data: {
        status: "PAID",
        paymentReference,
        receiptUrl,
        receiptPathname,
        reviewedByUserId: actor!.id,
        reviewedAt: new Date(),
      },
    });

    return { ok: true as const, amountCents: w.amountCents, currency: w.currency };
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: result.message }, { status: result.status });
  }

  await registrarAuditoria({
    actorUserId: actor!.id,
    accion: "withdrawal_request.paid",
    entidadTipo: "withdrawal_request",
    entidadId: id,
    metadata: { amountCents: result.amountCents, currency: result.currency, paymentReference, receiptUrl },
  });

  return NextResponse.json({ ok: true, receiptUrl });
}

