import { SiteHeader } from "@/components/site/header";
import { GodProvider } from "@/components/ai/god-provider";

export default function PublicLayout(props: { children: React.ReactNode }) {
  return (
    <GodProvider>
      <div className="min-h-screen">
        <SiteHeader />
        <main>{props.children}</main>
      </div>
    </GodProvider>
  );
}
