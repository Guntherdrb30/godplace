import Link from "next/link";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { AllyWithdrawDialog } from "@/components/ally/withdraw-dialog";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Billetera", path: "/aliado/billetera" });

function badgeVariantForStatus(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "APPROVED":
      return "outline";
    case "REJECTED":
      return "destructive";
    case "PAID":
      return "default";
    default:
      return "secondary";
  }
}

function labelStatus(status: string): string {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
    case "PAID":
      return "Pagado";
    default:
      return status;
  }
}

export default async function AliadoBilleteraPage() {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) redirect("/aliado");

  const ally = await prisma.allyProfile.findUnique({
    where: { id: user.allyProfileId },
    include: { user: true },
  });
  if (!ally) redirect("/aliado");

  const wallet = await prisma.allyWallet.upsert({
    where: { allyProfileId: ally.id },
    update: {},
    create: { allyProfileId: ally.id },
  });

  const [txs, withdrawals] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.withdrawalRequest.findMany({
      where: { allyProfileId: ally.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const bankName = ally.bankName?.trim() || "";
  const bankAccountLast4 = ally.bankAccountLast4?.trim() || "";
  const accountHolderName = ally.bankAccountHolderName?.trim() || "";
  const holderId = ally.bankHolderId?.trim() || "";
  const bankOk = !!bankName && bankAccountLast4.length >= 4 && !!accountHolderName && !!holderId;
  const bankMasked = bankAccountLast4 ? `****${bankAccountLast4.slice(-4)}` : "—";

  return (
    <Container className="py-12">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Billetera</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tus ganancias como aliado se acumulan aquí. Retiros mínimos de $100. Operado por Trends172Tech.com.
          </p>
        </div>
        <AllyWithdrawDialog
          disabled={!bankOk || ally.status !== "KYC_APPROVED"}
          bankName={bankName || "—"}
          bankAccountMasked={bankMasked}
          accountHolderName={accountHolderName || "—"}
          holderId={holderId || "—"}
        />
      </div>

      {ally.status !== "KYC_APPROVED" ? (
        <div className="mt-6 rounded-2xl border bg-white/70 p-5 text-sm text-muted-foreground">
          Tu perfil aún no está aprobado. Completa tu KYC en{" "}
          <Link className="underline" href="/aliado/kyc">
            /aliado/kyc
          </Link>{" "}
          y espera la revisión.
        </div>
      ) : !bankOk ? (
        <div className="mt-6 rounded-2xl border bg-white/70 p-5 text-sm text-muted-foreground">
          Faltan datos bancarios en tu perfil. Completa tu información en{" "}
          <Link className="underline" href="/aliado/kyc">
            /aliado/kyc
          </Link>{" "}
          para poder solicitar retiros.
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Saldo disponible</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">
            {formatMoney(wallet.balanceAvailableCents, "USD")}
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Saldo pendiente</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">
            {formatMoney(wallet.balancePendingCents, "USD")}
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Cuenta registrada</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{bankName || "—"}</div>
            <div>{bankMasked}</div>
            <div className="mt-2">
              <span className="font-medium text-foreground">{accountHolderName || "—"}</span>
            </div>
            <div>{holderId || "—"}</div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Movimientos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {txs.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aún no hay movimientos.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Referencia / Nota</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="font-medium">{t.type}</TableCell>
                      <TableCell className={t.amountCents < 0 ? "text-destructive" : ""}>
                        {formatMoney(t.amountCents, t.currency)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.referenceId ? `${t.referenceType || "REF"}: ${t.referenceId.slice(0, 10)}…` : t.note || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Mis retiros</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {withdrawals.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aún no has solicitado retiros.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {w.createdAt.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell>{formatMoney(w.amountCents, w.currency)}</TableCell>
                      <TableCell>
                        <Badge variant={badgeVariantForStatus(w.status)}>{labelStatus(w.status)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {w.paymentReference || "—"}
                      </TableCell>
                      <TableCell>
                        {w.receiptUrl ? (
                          <a className="underline" href={w.receiptUrl} target="_blank" rel="noreferrer">
                            Ver
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

