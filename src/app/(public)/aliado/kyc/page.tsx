import { redirect } from "next/navigation";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AllyKycUploader } from "@/components/ally/kyc-uploader";
import { labelAllyStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "KYC Aliado", path: "/aliado/kyc" });

export default async function AliadoKycPage() {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) redirect("/aliado");

  const ally = await prisma.allyProfile.findUnique({
    where: { id: user.allyProfileId },
    include: { kycDocs: { orderBy: { createdAt: "desc" } } },
  });
  if (!ally) redirect("/aliado");

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">
          Verificación (KYC)
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Sube los documentos solicitados. Admin/Root revisan manualmente y pueden
          aprobar/rechazar con notas.
        </p>
        <div className="mt-6 rounded-2xl border bg-white/80 p-5 text-sm">
          <span className="text-muted-foreground">Estado del perfil:</span>{" "}
          <span className="font-medium text-foreground">{labelAllyStatus(ally.status)}</span>
        </div>

        <div className="mt-8">
          <AllyKycUploader
            allyProfileId={ally.id}
            docs={ally.kycDocs.map((d) => ({
              id: d.id,
              type: d.type,
              status: d.status,
              url: d.url,
              pathname: d.pathname,
              notasAdmin: d.notasAdmin,
              createdAt: d.createdAt.toISOString(),
            }))}
          />
        </div>
      </div>
    </Container>
  );
}
