import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Privacidad",
  path: "/privacidad",
});

export default function PrivacidadPage() {
  return (
    <Container className="py-12">
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Privacidad</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">
        Este texto es un placeholder de MVP. Debe ser reemplazado por una política de
        privacidad completa.
      </p>
      <div className="mt-6 rounded-2xl border bg-white/80 p-6 text-sm leading-7">
        <p className="font-medium">KYC</p>
        <p className="mt-2 text-muted-foreground">
          Los aliados pueden subir documentos (cédula, RIF, selfie con cédula, documento
          de propiedad/poder). Estos archivos se almacenan en Vercel Blob.
        </p>
        <p className="mt-4 font-medium">Acceso</p>
        <p className="mt-2 text-muted-foreground">
          Los documentos KYC se exponen únicamente en interfaces de Admin/Root. Como
          mejora futura, se implementarán URLs firmadas o acceso privado a Blob.
        </p>
        <p className="mt-4 font-medium">Operación</p>
        <p className="mt-2 text-muted-foreground">
          Desarrollado y operado por Trends172Tech.com.
        </p>
      </div>
    </Container>
  );
}

