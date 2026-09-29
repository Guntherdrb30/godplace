import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { prisma } from "@/lib/prisma";
import { TenantBrandingForm } from "@/components/admin/tenant-branding-form";

export const dynamic = "force-dynamic";

export default async function TenantBrandingPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Identidad</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Configura cómo se identifica esta inmobiliaria dentro del marketplace METRORA.
      </p>
      <TenantBrandingForm initial={tenant} />
    </div>
  );
}
