import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Auditoría", path: "/root/auditoria" });

export default async function RootAuditoriaPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Auditoría</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Últimas acciones registradas en <code>audit_logs</code>.
      </p>

      <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Logs</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Entidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </TableCell>
                  <TableCell className="font-medium">{l.accion}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {l.actorUserId ? l.actorUserId.slice(0, 10) + "…" : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {(l.entidadTipo || "-") + " " + (l.entidadId ? l.entidadId.slice(0, 10) + "…" : "")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
