import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Admin", path: "/admin" });

export default async function AdminPage() {
  const [propsCount, bookingsCount, aliadosPendientes] = await Promise.all([
    prisma.property.count(),
    prisma.booking.count(),
    prisma.allyProfile.count({ where: { status: "PENDING_KYC" } }),
  ]);

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Resumen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Operación de Godplaces. (ADMIN/ROOT). Acciones registradas en audit_logs.
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Propiedades</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">
            {propsCount}
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Reservas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">
            {bookingsCount}
          </CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>KYC pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">
            {aliadosPendientes}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
