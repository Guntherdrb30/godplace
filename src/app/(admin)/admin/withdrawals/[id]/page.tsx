import { notFound } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import { AdminWithdrawalActions } from "@/components/admin/withdrawal-actions";
import type { WithdrawalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Detalle retiro", path: "/admin/withdrawals" });

function labelStatus(s: WithdrawalStatus): string {
  switch (s) {
    case "PENDING":
      return "Pendiente";
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
    case "PAID":
      return "Pagado";
  }
}

function badgeVariant(s: WithdrawalStatus): "default" | "secondary" | "destructive" | "outline" {
  switch (s) {
    case "PENDING":
      return "secondary";
    case "APPROVED":
      return "outline";
    case "REJECTED":
      return "destructive";
    case "PAID":
      return "default";
  }
}

export default async function AdminWithdrawalDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const w = await prisma.withdrawalRequest.findUnique({
    where: { id },
    include: {
      allyProfile: { include: { user: true } },
      requestedBy: true,
      reviewedBy: true,
    },
  });
  if (!w) notFound();

  return (
    <Container>
      <div className="mb-6">
        <Link href="/admin/withdrawals" className="text-sm text-muted-foreground hover:text-foreground">
          ← Volver a retiros
        </Link>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Solicitud de retiro</h1>
          <div className="mt-2 text-sm text-muted-foreground">
            ID: <span className="font-mono">{w.id}</span>
          </div>
        </div>
        <AdminWithdrawalActions id={w.id} status={w.status} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={badgeVariant(w.status)}>{labelStatus(w.status)}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Monto</span>
              <span className="font-medium text-foreground">{formatMoney(w.amountCents, w.currency)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Fecha</span>
              <span className="font-medium text-foreground">{w.createdAt.toISOString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Aliado</span>
              <span className="font-medium text-foreground">{w.allyProfile.user.email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Solicitado por</span>
              <span className="font-medium text-foreground">{w.requestedBy.email}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Banco</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <div className="text-muted-foreground">Banco</div>
              <div className="font-medium text-foreground">{w.bankName}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Cuenta</div>
              <div className="font-medium text-foreground">{w.bankAccountMasked}</div>
            </div>
            <div>
              <div className="text-muted-foreground">Titular</div>
              <div className="font-medium text-foreground">{w.accountHolderName}</div>
              <div className="text-muted-foreground">{w.holderId}</div>
            </div>
            {w.paymentReference ? (
              <div>
                <div className="text-muted-foreground">Referencia</div>
                <div className="font-medium text-foreground">{w.paymentReference}</div>
              </div>
            ) : null}
            {w.rejectionReason ? (
              <div>
                <div className="text-muted-foreground">Razón de rechazo</div>
                <div className="font-medium text-foreground">{w.rejectionReason}</div>
              </div>
            ) : null}
            {w.receiptUrl ? (
              <div>
                <div className="text-muted-foreground">Comprobante</div>
                <a className="underline" href={w.receiptUrl} target="_blank" rel="noreferrer">
                  Ver archivo
                </a>
              </div>
            ) : null}
            {w.reviewedBy ? (
              <div className="pt-2 text-xs text-muted-foreground">
                Revisado por {w.reviewedBy.email} {w.reviewedAt ? `(${w.reviewedAt.toISOString()})` : ""}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

