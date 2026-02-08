import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "No autorizado",
  path: "/no-autorizado",
});

export default function NoAutorizadoPage() {
  return (
    <Container className="py-12">
      <div className="rounded-3xl border bg-white/80 p-10 shadow-suave">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">No autorizado</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          No tienes permisos para acceder a esta sección.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]">
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Acceder</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
