import { Container } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <Container className="py-14">
      <div className="rounded-3xl border bg-white/85 p-10 shadow-suave">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Página no encontrada</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          La ruta que intentas abrir no existe.
        </p>
        <div className="mt-6 flex gap-3">
          <Button asChild className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]">
            <Link href="/">Ir al inicio</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/search">Explorar</Link>
          </Button>
        </div>
      </div>
    </Container>
  );
}
