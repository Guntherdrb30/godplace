import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "ROOT", path: "/root" });

export default async function RootPage() {
  const [users, roles, settings, logs] = await Promise.all([
    prisma.user.count(),
    prisma.role.count(),
    prisma.systemSetting.count(),
    prisma.auditLog.count(),
  ]);

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">
        ROOT (capa crítica)
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gestión crítica: roles ROOT/ADMIN, settings globales, integraciones y auditoría avanzada.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-4">
        {[
          { t: "Usuarios", v: users },
          { t: "Roles", v: roles },
          { t: "Configuración", v: settings },
          { t: "Logs de auditoría", v: logs },
        ].map((x) => (
          <Card key={x.t} className="rounded-3xl bg-white/85 shadow-suave">
            <CardHeader>
              <CardTitle>{x.t}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold text-marca-petroleo">
              {x.v}
            </CardContent>
          </Card>
        ))}
      </div>
    </Container>
  );
}
