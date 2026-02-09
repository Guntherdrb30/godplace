import { redirect } from "next/navigation";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AllyContractUploader } from "@/components/ally/contract-uploader";
import { buildAllyContractEmail } from "@/lib/contracts/ally";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Contrato (Aliado)", path: "/aliado/contrato" });

export default async function AliadoContratoPage() {
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) redirect("/aliado");

  const ally = await prisma.allyProfile.findUnique({
    where: { id: user.allyProfileId },
    include: { user: true, contract: true },
  });
  if (!ally) redirect("/aliado");

  const contract = buildAllyContractEmail({
    allyProfileId: ally.id,
    firstName: ally.firstName || ally.user.nombre || "",
    lastName: ally.lastName || "",
    email: ally.user.email,
    username: ally.user.username || ally.user.email,
    phone: ally.phone || "",
    isCompany: ally.isCompany,
    companyName: ally.companyName,
    rifNumber: ally.rifNumber,
    dateOfBirth: ally.dateOfBirth ? ally.dateOfBirth.toISOString().slice(0, 10) : null,
    sex: ally.sex || null,
  });

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Contrato de aliado</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Tu cuenta de aliado queda <span className="font-medium text-foreground">limitada</span> hasta que completes el proceso y Godplaces apruebe manualmente.
          Primero firma y sube el contrato, y completa tu KYC en <a className="underline" href="/aliado/kyc">/aliado/kyc</a>.
        </p>

        <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Subir contrato firmado</CardTitle>
          </CardHeader>
          <CardContent>
            <AllyContractUploader
              allyProfileId={ally.id}
              contract={
                ally.contract
                  ? {
                      id: ally.contract.id,
                      status: ally.contract.status,
                      url: ally.contract.url,
                      pathname: ally.contract.pathname,
                      notasAdmin: ally.contract.notasAdmin,
                    }
                  : null
              }
            />
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Contrato prellenado (borrador)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Este texto es el mismo que se envía por correo. Puedes imprimirlo/firmarlo y luego subirlo firmado.
            </p>
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border bg-white p-4 text-xs leading-5 text-muted-foreground">
{contract.text}
            </pre>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}

