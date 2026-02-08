import Link from "next/link";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/format";
import type { WithdrawalStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Retiros", path: "/admin/withdrawals" });

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

export default async function AdminWithdrawalsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const statusRaw = typeof sp.status === "string" ? sp.status : "";
  const allowedStatuses: WithdrawalStatus[] = ["PENDING", "APPROVED", "REJECTED", "PAID"];
  const status = allowedStatuses.includes(statusRaw as WithdrawalStatus) ? (statusRaw as WithdrawalStatus) : null;

  const withdrawals = await prisma.withdrawalRequest.findMany({
    where: status ? { status } : {},
    include: { allyProfile: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  const pendientes = await prisma.withdrawalRequest.count({ where: { status: "PENDING" } });

  return (
    <Container>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Retiros</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solicitudes de retiro de aliados. Operación auditable (audit_logs). Desarrollado y operado por Trends172Tech.com.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          Pendientes: <span className="font-medium text-foreground">{pendientes}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {[
          { label: "Todas", href: "/admin/withdrawals" },
          { label: "Pendientes", href: "/admin/withdrawals?status=PENDING" },
          { label: "Aprobadas", href: "/admin/withdrawals?status=APPROVED" },
          { label: "Rechazadas", href: "/admin/withdrawals?status=REJECTED" },
          { label: "Pagadas", href: "/admin/withdrawals?status=PAID" },
        ].map((x) => (
          <Link key={x.href} href={x.href} className="rounded-full border bg-white/80 px-3 py-1 hover:bg-white">
            {x.label}
          </Link>
        ))}
      </div>

      <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {withdrawals.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay solicitudes.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Aliado</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cuenta</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="text-xs text-muted-foreground">{w.createdAt.toISOString().slice(0, 10)}</TableCell>
                    <TableCell className="font-medium">{w.allyProfile.user.email}</TableCell>
                    <TableCell>{formatMoney(w.amountCents, w.currency)}</TableCell>
                    <TableCell>
                      <Badge variant={badgeVariant(w.status)}>{labelStatus(w.status)}</Badge>
                      {w.status === "PENDING" ? <span className="ml-2 text-xs text-brand-primary">Nuevo</span> : null}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{w.bankName} {w.bankAccountMasked}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="font-medium text-foreground">{w.accountHolderName}</div>
                      <div>{w.holderId}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link className="underline" href={`/admin/withdrawals/${w.id}`}>
                        Ver detalle
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
