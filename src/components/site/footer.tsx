import { Container } from "@/components/site/container";
import Link from "next/link";
import { getSiteBranding } from "@/lib/site-branding";

export async function SiteFooter() {
  const branding = await getSiteBranding();
  return (
    <footer className="mt-16 border-t bg-white/70 backdrop-blur">
      <Container className="py-10">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="font-medium text-foreground">{branding.brandName}.</span>{" "}
            <span className="text-muted-foreground">
              Alquiler temporal en Venezuela.
            </span>
          </div>
          <div className="text-muted-foreground">
            Desarrollado y operado por{" "}
            <span className="font-medium text-foreground">Trends172Tech.com</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          <Link className="text-muted-foreground hover:text-foreground" href="/terminos">
            Términos
          </Link>
          <Link className="text-muted-foreground hover:text-foreground" href="/privacidad">
            Privacidad
          </Link>
        </div>
      </Container>
    </footer>
  );
}
