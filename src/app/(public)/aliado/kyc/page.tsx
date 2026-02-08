import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AllyKycUploader } from "@/components/ally/kyc-uploader";
import { labelAllyStatus } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registrarAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "KYC Aliado", path: "/aliado/kyc" });

async function guardarBanco(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) redirect("/aliado");

  const bankName = String(formData.get("bankName") || "").trim();
  const bankAccountLast4 = String(formData.get("bankAccountLast4") || "").trim();
  const bankAccountHolderName = String(formData.get("bankAccountHolderName") || "").trim();
  const bankHolderId = String(formData.get("bankHolderId") || "").trim();

  if (!bankName || !bankAccountHolderName || !bankHolderId) {
    throw new Error("Faltan datos bancarios.");
  }
  if (!/^[0-9]{4}$/.test(bankAccountLast4)) {
    throw new Error("Los últimos 4 dígitos deben ser numéricos.");
  }

  await prisma.allyProfile.update({
    where: { id: user.allyProfileId },
    data: { bankName, bankAccountLast4, bankAccountHolderName, bankHolderId },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_profile.update_bank_details",
    entidadTipo: "ally_profile",
    entidadId: user.allyProfileId,
    metadata: { bankName, bankAccountLast4 },
  });

  revalidatePath("/aliado/kyc");
}

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
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Verificación (KYC)</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Sube los documentos solicitados. Admin/Root revisan manualmente y pueden aprobar/rechazar con notas.
        </p>
        <div className="mt-6 rounded-2xl border bg-white/80 p-5 text-sm">
          <span className="text-muted-foreground">Estado del perfil:</span>{" "}
          <span className="font-medium text-foreground">{labelAllyStatus(ally.status)}</span>
        </div>

        <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Datos bancarios (para retiros)</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={guardarBanco} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="bankName">Banco</Label>
                <Input id="bankName" name="bankName" defaultValue={ally.bankName || ""} placeholder="Ej: Banesco" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bankAccountLast4">Últimos 4 dígitos</Label>
                <Input
                  id="bankAccountLast4"
                  name="bankAccountLast4"
                  defaultValue={ally.bankAccountLast4 || ""}
                  placeholder="Ej: 1234"
                  inputMode="numeric"
                  pattern="\\d{4}"
                  maxLength={4}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="bankHolderId">Cédula o RIF</Label>
                <Input id="bankHolderId" name="bankHolderId" defaultValue={ally.bankHolderId || ""} placeholder="Ej: V-12345678" required />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="bankAccountHolderName">Titular</Label>
                <Input id="bankAccountHolderName" name="bankAccountHolderName" defaultValue={ally.bankAccountHolderName || ""} placeholder="Nombre del titular" required />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90">
                  Guardar datos bancarios
                </Button>
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Por seguridad, Godplaces. solo guarda los últimos 4 dígitos de la cuenta. Desarrollado y operado por Trends172Tech.com.
              </p>
            </form>
          </CardContent>
        </Card>

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

