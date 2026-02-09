import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { labelAllyStatus, labelKycStatus } from "@/lib/labels";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Aliados", path: "/admin/aliados" });

function hasApprovedDoc(
  docs: Array<{ type: string; status: string }>,
  type: "CEDULA" | "RIF" | "SELFIE_CEDULA",
) {
  return docs.some((d) => d.type === type && d.status === "APPROVED");
}

async function aprobarAliado(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const allyProfileId = String(formData.get("allyProfileId") || "");
  if (!allyProfileId) throw new Error("Falta allyProfileId.");

  const ally = await prisma.allyProfile.findUnique({
    where: { id: allyProfileId },
    include: { user: true, contract: true, kycDocs: true },
  });
  if (!ally) throw new Error("No existe el aliado.");
  if (!ally.contract) throw new Error("Falta contrato firmado.");
  if (ally.contract.status !== "PENDING") throw new Error("El contrato no estÃ¡ pendiente.");

  if (!hasApprovedDoc(ally.kycDocs, "CEDULA")) throw new Error("Falta aprobar CEDULA.");
  if (!hasApprovedDoc(ally.kycDocs, "SELFIE_CEDULA")) throw new Error("Falta aprobar SELFIE_CEDULA.");
  if (ally.isCompany && !hasApprovedDoc(ally.kycDocs, "RIF")) throw new Error("Falta aprobar RIF.");

  await prisma.$transaction(async (tx) => {
    await tx.allyContract.update({
      where: { id: ally.contract!.id },
      data: { status: "APPROVED" },
    });
    await tx.allyProfile.update({
      where: { id: ally.id },
      data: { status: "KYC_APPROVED" },
    });
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "ally.approve",
    entidadTipo: "ally_profile",
    entidadId: ally.id,
  });

  await sendEmail({
    to: ally.user.email,
    subject: "Godplaces: tu cuenta de aliado fue aprobada",
    text: [
      "Tu cuenta de aliado ha sido aprobada.",
      "Ya puedes acceder a tu panel y cargar propiedades (cada propiedad tambiÃ©n pasa por revisiÃ³n).",
    ].join("\n"),
  }).catch((e) => {
    console.warn("[EMAIL][WARN] FallÃ³ envÃ­o de aprobaciÃ³n de aliado:", e);
  });

  revalidatePath("/admin/aliados");
  revalidatePath("/admin/kyc");
}

async function rechazarAliado(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const allyProfileId = String(formData.get("allyProfileId") || "");
  const notasAdmin = String(formData.get("notasAdmin") || "").trim() || null;
  if (!allyProfileId) throw new Error("Falta allyProfileId.");

  const ally = await prisma.allyProfile.findUnique({
    where: { id: allyProfileId },
    include: { user: true, contract: true },
  });
  if (!ally) throw new Error("No existe el aliado.");

  await prisma.$transaction(async (tx) => {
    await tx.allyProfile.update({
      where: { id: ally.id },
      data: { status: "KYC_REJECTED", notasAdmin },
    });
    if (ally.contract) {
      await tx.allyContract.update({
        where: { id: ally.contract.id },
        data: { status: "REJECTED", notasAdmin },
      });
    }
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "ally.reject",
    entidadTipo: "ally_profile",
    entidadId: ally.id,
    metadata: { notasAdmin },
  });

  await sendEmail({
    to: ally.user.email,
    subject: "Godplaces: tu cuenta de aliado fue rechazada",
    text: [
      "Tu cuenta de aliado fue rechazada.",
      notasAdmin ? `Motivo/Notas: ${notasAdmin}` : "Motivo/Notas: (no especificado)",
      "",
      "Puedes ingresar y corregir la informaciÃ³n/documentos y volver a enviar tu contrato si aplica.",
    ].join("\n"),
  }).catch((e) => {
    console.warn("[EMAIL][WARN] FallÃ³ envÃ­o de rechazo de aliado:", e);
  });

  revalidatePath("/admin/aliados");
  revalidatePath("/admin/kyc");
}

export default async function AdminAliadosPage() {
  const allies = await prisma.allyProfile.findMany({
    where: { isInternal: false },
    include: {
      user: true,
      contract: true,
      kycDocs: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Aliados</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        RevisiÃ³n de contratos firmados y aprobaciÃ³n final del aliado.
      </p>

      <div className="mt-8 grid gap-6">
        {allies.length === 0 ? (
          <div className="rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
            No hay aliados externos registrados todavÃ­a.
          </div>
        ) : (
          allies.map((a) => {
            const missing = [
              hasApprovedDoc(a.kycDocs, "CEDULA") ? null : "CEDULA",
              hasApprovedDoc(a.kycDocs, "SELFIE_CEDULA") ? null : "SELFIE_CEDULA",
              a.isCompany ? (hasApprovedDoc(a.kycDocs, "RIF") ? null : "RIF") : null,
            ].filter(Boolean);

            return (
              <Card key={a.id} className="rounded-3xl bg-white/85 shadow-suave">
                <CardHeader>
                  <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                      {a.user.nombre || a.user.email}{" "}
                      <span className="text-sm text-muted-foreground">({a.user.email})</span>
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Perfil:{" "}
                      <span className="font-medium text-foreground">{labelAllyStatus(a.status)}</span>
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border bg-white p-4 text-sm">
                    <div className="text-muted-foreground">Contrato:</div>
                    {a.contract ? (
                      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">
                            {labelKycStatus(a.contract.status)}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">{a.contract.pathname}</div>
                        </div>
                        <div className="flex gap-2">
                          <a className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary" href={a.contract.url} target="_blank" rel="noreferrer">
                            Ver
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-2 text-sm text-muted-foreground">No cargado.</div>
                    )}
                  </div>

                  {missing.length ? (
                    <div className="rounded-2xl border border-destructive/20 bg-white p-4 text-sm text-muted-foreground">
                      Documentos sin aprobar: <span className="font-medium text-foreground">{missing.join(", ")}</span>
                    </div>
                  ) : null}

                  <form action={aprobarAliado} className="flex justify-end gap-2">
                    <input type="hidden" name="allyProfileId" value={a.id} />
                    <Button type="submit" variant="brand">
                      Aprobar aliado
                    </Button>
                  </form>

                  <form action={rechazarAliado} className="grid gap-2 rounded-2xl border bg-white p-4">
                    <input type="hidden" name="allyProfileId" value={a.id} />
                    <Label htmlFor={`r-${a.id}`}>Notas / motivo de rechazo</Label>
                    <Textarea id={`r-${a.id}`} name="notasAdmin" rows={3} placeholder="Ej: Falta selfie legible, contrato incompleto..." />
                    <div className="flex justify-end">
                      <Button type="submit" variant="outline">
                        Rechazar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </Container>
  );
}

