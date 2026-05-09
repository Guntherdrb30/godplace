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
import type { AllyStatus, KycStatus } from "@prisma/client";
import { labelAllyStatus, labelKycStatus } from "@/lib/labels";
import { buildProtectedBlobUrl } from "@/lib/blob/shared";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "KYC", path: "/admin/kyc" });

async function actualizarDocConEstado(status: KycStatus, formData: FormData) {
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "").trim();
  const notasAdmin = String(formData.get("notasAdmin") || "").trim() || null;
  if (!id) throw new Error("Falta id.");

  await prisma.kycDocument.update({
    where: { id },
    data: { status, notasAdmin },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "kyc_document.update_status",
    entidadTipo: "kyc_document",
    entidadId: id,
    metadata: { status, notasAdmin },
  });

  revalidatePath("/admin/kyc");
}

async function actualizarDocPendiente(formData: FormData) {
  "use server";
  return actualizarDocConEstado("PENDING", formData);
}

async function actualizarDocAprobado(formData: FormData) {
  "use server";
  return actualizarDocConEstado("APPROVED", formData);
}

async function actualizarDocRechazado(formData: FormData) {
  "use server";
  return actualizarDocConEstado("REJECTED", formData);
}

async function actualizarPerfilConEstado(status: AllyStatus, formData: FormData) {
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "").trim();
  const notasAdmin = String(formData.get("notasAdmin") || "").trim() || null;
  if (!id) throw new Error("Falta id.");

  await prisma.allyProfile.update({
    where: { id },
    data: { status, notasAdmin },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "ally_profile.update_status",
    entidadTipo: "ally_profile",
    entidadId: id,
    metadata: { status, notasAdmin },
  });

  revalidatePath("/admin/kyc");
}

async function actualizarPerfilPendiente(formData: FormData) {
  "use server";
  return actualizarPerfilConEstado("PENDING_KYC", formData);
}

async function actualizarPerfilAprobado(formData: FormData) {
  "use server";
  return actualizarPerfilConEstado("KYC_APPROVED", formData);
}

async function actualizarPerfilRechazado(formData: FormData) {
  "use server";
  return actualizarPerfilConEstado("KYC_REJECTED", formData);
}

async function actualizarPerfilSuspendido(formData: FormData) {
  "use server";
  return actualizarPerfilConEstado("SUSPENDED", formData);
}

export default async function AdminKycPage() {
  const allies = await prisma.allyProfile.findMany({
    where: { isInternal: false },
    include: {
      user: true,
      kycDocs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">KYC</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Revisión manual de documentos y estado del aliado.
      </p>

      <div className="mt-8 grid gap-6">
        {allies.length === 0 ? (
          <div className="rounded-2xl border bg-white/70 p-8 text-sm text-muted-foreground">
            No hay aliados externos registrados todavía.
          </div>
        ) : (
          allies.map((a) => (
            <Card key={a.id} className="rounded-3xl bg-white/85 shadow-suave">
              <CardHeader>
                <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    {a.user.nombre || a.user.email}{" "}
                    <span className="text-sm text-muted-foreground">({a.user.email})</span>
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Estado perfil:{" "}
                    <span className="font-medium text-foreground">
                      {labelAllyStatus(a.status)}
                    </span>
                  </span>
                </CardTitle>
              </CardHeader>
                <CardContent className="space-y-6">
                  <form
                    action={actualizarPerfilPendiente}
                    className="grid gap-3 rounded-2xl border bg-white p-4"
                  >
                    <input type="hidden" name="id" value={a.id} />
                  <div className="grid gap-2">
                    <Label htmlFor={`perfil-${a.id}`}>Notas (perfil)</Label>
                    <Textarea id={`perfil-${a.id}`} name="notasAdmin" defaultValue={a.notasAdmin || ""} rows={3} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { s: "PENDING_KYC", action: actualizarPerfilPendiente },
                        { s: "KYC_APPROVED", action: actualizarPerfilAprobado },
                        { s: "KYC_REJECTED", action: actualizarPerfilRechazado },
                        { s: "SUSPENDED", action: actualizarPerfilSuspendido },
                      ] as const
                    ).map(({ s, action }) => (
                      <Button key={s} type="submit" variant="outline" formAction={action}>
                        {labelAllyStatus(s)}
                      </Button>
                    ))}
                    </div>
                  </form>

                <div className="space-y-4">
                  <div className="text-sm font-medium">Documentos</div>
                  {a.kycDocs.length === 0 ? (
                    <div className="rounded-2xl border bg-white/70 p-4 text-sm text-muted-foreground">
                      Sin documentos.
                    </div>
                  ) : (
                    a.kycDocs.map((d) => (
                      <div key={d.id} className="rounded-2xl border bg-white p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="font-medium text-foreground">{d.type}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Estado:{" "}
                              <span className="font-medium text-foreground">
                                {labelKycStatus(d.status)}
                              </span>
                            </div>
                            <div className="mt-2 truncate text-xs text-muted-foreground">{d.pathname}</div>
                          </div>
                          <div className="flex gap-2">
                            <a
                              className="inline-flex h-9 items-center rounded-md border bg-white px-3 text-sm hover:bg-secondary"
                              href={buildProtectedBlobUrl(d.pathname)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ver
                            </a>
                          </div>
                        </div>

                        <form action={actualizarDocPendiente} className="mt-3 grid gap-3">
                          <input type="hidden" name="id" value={d.id} />
                          <div className="grid gap-2">
                            <Label htmlFor={`doc-${d.id}`}>Notas (documento)</Label>
                            <Textarea
                              id={`doc-${d.id}`}
                              name="notasAdmin"
                              defaultValue={d.notasAdmin || ""}
                              rows={3}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(
                              [
                                { s: "PENDING", action: actualizarDocPendiente },
                                { s: "APPROVED", action: actualizarDocAprobado },
                                { s: "REJECTED", action: actualizarDocRechazado },
                              ] as const
                            ).map(({ s, action }) => (
                              <Button key={s} type="submit" variant="outline" formAction={action}>
                                {labelKycStatus(s)}
                              </Button>
                            ))}
                          </div>
                        </form>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </Container>
  );
}
