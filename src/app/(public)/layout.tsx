import { SiteNavbar } from "@/components/site/navbar";
import { GodProvider } from "@/components/ai/god-provider";
import { getSiteBranding } from "@/lib/site-branding";

export default async function PublicLayout(props: { children: React.ReactNode }) {
  const branding = await getSiteBranding();
  return (
    <GodProvider
      branding={{
        brandName: branding.brandName,
        agentName: branding.agentName,
        colors: branding.colors,
      }}
    >
      <div className="min-h-screen">
        <SiteNavbar />
        <main>{props.children}</main>
      </div>
    </GodProvider>
  );
}
