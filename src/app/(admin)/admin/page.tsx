import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Admin", path: "/admin" });

export default async function AdminPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);

  const [
    propsCount,
    bookingsCount,
    kycPendientes,
    propertiesPendientes,
    aliadosPendientes,
    tenant,
    adminMemberships,
    agentsCount,
    listingsCount,
  ] = await Promise.all([
    prisma.property.count({ where: { tenantId } }),
    prisma.booking.count({ where: { tenantId } }),
    prisma.allyProfile.count({ where: { tenantId, status: "PENDING_KYC" } }),
    prisma.property.count({ where: { tenantId, status: "PENDING_APPROVAL" } }),
    prisma.allyContract.count({
      where: { status: "PENDING", allyProfile: { tenantId } },
    }),
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.tenantMembership.count({
      where: { tenantId, isActive: true, role: { in: ["OWNER", "ADMIN"] } },
    }),
    prisma.agentProfile.count({ where: { tenantId, isActive: true } }),
    prisma.listing.count({ where: { tenantId } }),
  ]);

  const identityReady = Boolean(
    tenant.name &&
      (tenant.logoUrl || tenant.contactEmail || tenant.contactPhone || tenant.contactWhatsapp || tenant.websiteUrl),
  );
  const onboardingComplete =
    identityReady &&
    adminMemberships > 0 &&
    agentsCount > 0 &&
    propsCount > 0 &&
    listingsCount > 0;

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Resumen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Operación de la inmobiliaria activa en METRORA. Acciones registradas en audit_logs.
      </p>

      {!onboardingComplete ? (
        <div className="mt-8 rounded-3xl border border-brand-primary/20 bg-brand-primary/5 p-6">
          <div className="font-medium text-foreground">Completa la configuración de esta inmobiliaria</div>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            METRORA detectó que todavía faltan pasos para dejar el tenant listo para operar y publicar.
          </p>
          <Button asChild variant="brand" className="mt-4">
            <Link href="/admin/onboarding">Continuar onboarding</Link>
          </Button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Propiedades</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">{propsCount}</CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Reservas</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">{bookingsCount}</CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>KYC pendientes</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">{kycPendientes}</CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Propiedades en revisión</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">{propertiesPendientes}</CardContent>
        </Card>
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Aliados (contratos)</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold text-marca-petroleo">{aliadosPendientes}</CardContent>
        </Card>
      </div>
    </Container>
  );
}

