import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { getSiteBranding } from "@/lib/site-branding";
import { SiteBrandingForm } from "@/components/root/site-branding-form";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Branding", path: "/root/branding" });

export default async function RootBrandingPage() {
  await requireRole(["ROOT"]);
  const b = await getSiteBranding();

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Branding</h1>
      <p className="mt-2 text-sm text-muted-foreground">Logo, nombre del agente y colores (solo ROOT).</p>

      <SiteBrandingForm
        initial={{
          brandName: b.brandName,
          agentName: b.agentName,
          logoUrl: b.logoUrl,
          logoPathname: b.logoPathname,
          colors: { ...b.colors },
        }}
      />
    </Container>
  );
}

