import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Términos",
  path: "/terminos",
});

export default function TerminosPage() {
  return (
    <Container className="py-12">
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Términos</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Godplaces. es una plataforma de alquiler temporal operada por una empresa central.
        Este documento es un placeholder de MVP y debe ser reemplazado por textos legales
        definitivos.
      </p>
      <div className="mt-6 rounded-2xl border bg-white/80 p-6 text-sm leading-7">
        <p className="font-medium">Operación</p>
        <p className="mt-2 text-muted-foreground">
          Desarrollado y operado por Trends172Tech.com. La plataforma puede aprobar o
          rechazar publicaciones, y suspender usuarios por seguridad operativa.
        </p>
        <p className="mt-4 font-medium">Pagos</p>
        <p className="mt-2 text-muted-foreground">
          En el MVP, los pagos reales no están integrados. Las entidades <code>payments</code>{" "}
          y <code>payouts</code> son placeholders con TODO.
        </p>
      </div>
    </Container>
  );
}

