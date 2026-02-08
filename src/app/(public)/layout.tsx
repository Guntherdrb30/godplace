import { SiteNavbar } from "@/components/site/navbar";
import { GodProvider } from "@/components/ai/god-provider";

export default function PublicLayout(props: { children: React.ReactNode }) {
  return (
    <GodProvider>
      <div className="min-h-screen">
        <SiteNavbar />
        <main>{props.children}</main>
      </div>
    </GodProvider>
  );
}
