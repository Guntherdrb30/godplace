import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { AllyKycUploader } from "@/components/ally/kyc-uploader";
import { labelAllyStatus, labelKycStatus } from "@/lib/labels";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registrarAuditoria } from "@/lib/audit";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "KYC Aliado", path: "/aliado/kyc" });

async function guardarDatosPersonales(formData: FormData) {
  "use server";
  const user = await requireRole(["ALIADO"]);
  if (!user.allyProfileId) redirect("/aliado");

  const firstName = String(formData.get("firstName") || "").trim();
  const lastName = String(formData.get("lastName") || "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") || "").trim();
  const sex = String(formData.get("sex") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const contactEmail = String(formData.get("contactEmail") || "").trim();
  const isCompany = String(formData.get("isCompany") || "") === "1";
  const companyName = String(formData.get("companyName") || "").trim() || null;
  const rifNumber = String(formData.get("rifNumber") || "").trim() || null;

  if (!firstName || !lastName || !dateOfBirth || !sex || !phone || !contactEmail) {
    throw new Error("Faltan datos personales obligatorios.");
  }
  if (!contactEmail.includes("@")) {
    throw new Error("Email de contacto invÃ¡lido.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
    throw new Error("Fecha de nacimiento invÃ¡lida.");
  }
  if (!["M", "F", "O"].includes(sex)) {
    throw new Error("Sexo invÃ¡lido.");
  }
  if (isCompany && (!companyName || !rifNumber)) {
    throw new Error("Faltan datos de empresa (nombre/RIF).");
  }

  await prisma.allyProfile.update({
    where: { id: user.allyProfileId },
    data: {
      firstName,
      lastName,
      dateOfBirth: new Date(`${dateOfBirth}T00:00:00.000Z`),
      sex,
      phone,
      contactEmail,
      isCompany,
      companyName: isCompany ? companyName : null,
      rifNumber: isCompany ? rifNumber : null,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally_profile.update_personal_details",
    entidadTipo: "ally_profile",
    entidadId: user.allyProfileId,
    metadata: { isCompany },
  });

  revalidatePath("/aliado/kyc");
}

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
    throw new Error("Los Ãºltimos 4 dÃ­gitos deben ser numÃ©ricos.");
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
    include: {
      user: true,
      contract: true,
      kycDocs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!ally) redirect("/aliado");

  const requiredDocTypes: Array<"CEDULA" | "RIF" | "SELFIE_CEDULA"> = ally.isCompany
    ? ["CEDULA", "RIF", "SELFIE_CEDULA"]
    : ["CEDULA", "SELFIE_CEDULA"];

  const missing = requiredDocTypes.filter((t) => !ally.kycDocs.some((d) => d.type === t));

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">VerificaciÃ³n (KYC)</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Completa tus datos y sube los documentos solicitados. Admin/Root revisan manualmente y pueden aprobar/rechazar con notas.
          Crear tu usuario no garantiza aprobaciÃ³n.
        </p>

        <div className="mt-6 grid gap-3">
          <div className="rounded-2xl border bg-white/80 p-5 text-sm">
            <span className="text-muted-foreground">Estado del perfil:</span>{" "}
            <span className="font-medium text-foreground">{labelAllyStatus(ally.status)}</span>
          </div>
          <div className="rounded-2xl border bg-white/80 p-5 text-sm">
            <span className="text-muted-foreground">Contrato:</span>{" "}
            <span className="font-medium text-foreground">
              {ally.contract ? labelKycStatus(ally.contract.status) : "No cargado"}
            </span>
            <div className="mt-2 text-xs text-muted-foreground">
              Sube tu contrato firmado en <a className="underline" href="/aliado/contrato">/aliado/contrato</a>.
            </div>
          </div>
        </div>

        {missing.length ? (
          <div className="mt-6 rounded-2xl border border-destructive/20 bg-white p-5 text-sm text-muted-foreground">
            Documentos obligatorios faltantes: <span className="font-medium text-foreground">{missing.join(", ")}</span>.
            Sube los archivos abajo.
          </div>
        ) : null}

        <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Datos personales</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={guardarDatosPersonales} className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input id="firstName" name="firstName" defaultValue={ally.firstName || ally.user.nombre || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input id="lastName" name="lastName" defaultValue={ally.lastName || ""} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dateOfBirth">Fecha de nacimiento</Label>
                <Input
                  id="dateOfBirth"
                  name="dateOfBirth"
                  type="date"
                  defaultValue={ally.dateOfBirth ? ally.dateOfBirth.toISOString().slice(0, 10) : ""}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="sex">Sexo</Label>
                <select
                  id="sex"
                  name="sex"
                  className="h-10 rounded-md border bg-white px-3 text-sm"
                  defaultValue={ally.sex || ""}
                  required
                >
                  <option value="">Selecciona...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="O">Otro</option>
                </select>
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="phone">TelÃ©fono</Label>
                <Input id="phone" name="phone" defaultValue={ally.phone || ""} required />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="contactEmail">Email de contacto</Label>
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={ally.contactEmail || ally.user.email} required />
              </div>

              <div className="sm:col-span-2 rounded-2xl border bg-white p-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="isCompany" value="1" defaultChecked={ally.isCompany} />
                  Soy empresa
                </label>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="companyName">Nombre de la empresa</Label>
                    <Input id="companyName" name="companyName" defaultValue={ally.companyName || ""} placeholder="Si aplica" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="rifNumber">RIF</Label>
                    <Input id="rifNumber" name="rifNumber" defaultValue={ally.rifNumber || ""} placeholder="Si aplica" />
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Si eres empresa, debes subir tambiÃ©n el documento RIF.
                </p>
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="brand">
                  Guardar datos personales
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

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
                <Label htmlFor="bankAccountLast4">Ãšltimos 4 dÃ­gitos</Label>
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
                <Label htmlFor="bankHolderId">CÃ©dula o RIF</Label>
                <Input id="bankHolderId" name="bankHolderId" defaultValue={ally.bankHolderId || ""} placeholder="Ej: V-12345678" required />
              </div>
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="bankAccountHolderName">Titular</Label>
                <Input id="bankAccountHolderName" name="bankAccountHolderName" defaultValue={ally.bankAccountHolderName || ""} placeholder="Nombre del titular" required />
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button type="submit" variant="brand">
                  Guardar datos bancarios
                </Button>
              </div>
              <p className="sm:col-span-2 text-xs text-muted-foreground">
                Por seguridad, Godplaces. solo guarda los Ãºltimos 4 dÃ­gitos de la cuenta.
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
