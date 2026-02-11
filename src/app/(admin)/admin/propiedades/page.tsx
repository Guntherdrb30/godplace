import Link from "next/link";
import { revalidatePath } from "next/cache";
import type { PropertyStatus } from "@prisma/client";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AdminPropertyCreateForm } from "@/components/admin/admin-property-create-form";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { labelPropertyStatus } from "@/lib/labels";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Propiedades", path: "/admin/propiedades" });

async function cambiarEstadoPropiedad(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);

  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) throw new Error("Falta id.");
  if (!["DRAFT", "PENDING_APPROVAL", "PUBLISHED", "REJECTED"].includes(status)) {
    throw new Error("Estado invalido.");
  }

  const p = await prisma.property.findUnique({
    where: { id },
    include: { images: true, allyProfile: { include: { user: true } } },
  });
  if (!p) throw new Error("No existe.");

  if (status === "PUBLISHED") {
    if (!p.ownershipContractUrl || !p.ownershipContractPathname) throw new Error("Falta contrato de propiedad.");
    if (p.images.length < 1) throw new Error("Faltan imagenes.");
    if (p.images.length > 6) throw new Error("Maximo 6 imagenes.");
  }

  await prisma.property.update({
    where: { id },
    data: { status: status as PropertyStatus },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "property.update_status",
    entidadTipo: "property",
    entidadId: id,
    metadata: { status },
  });

  if (!p.allyProfile.isInternal && (status === "PUBLISHED" || status === "REJECTED")) {
    const to = p.allyProfile.user.email;
    await sendEmail({
      to,
      subject: status === "PUBLISHED" ? "Godplaces: tu propiedad fue verificada" : "Godplaces: tu propiedad fue rechazada",
      text:
        status === "PUBLISHED"
          ? `Tu propiedad fue verificada y publicada: ${p.titulo}`
          : `Tu propiedad fue rechazada: ${p.titulo}`,
    }).catch((e) => console.warn("[EMAIL][WARN] Fallo envio de notificacion de propiedad:", e));
  }

  revalidatePath("/admin/propiedades");
}

export default async function AdminPropiedadesPage() {
  await requireRole(["ADMIN", "ROOT"]);

  const props = await prisma.property.findMany({
    include: {
      images: { take: 1, orderBy: { orden: "asc" } },
      allyProfile: { include: { user: true } },
      _count: { select: { images: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return (
    <Container className="max-w-7xl">
      <div className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-white via-secondary/50 to-brand-primary/10 p-6 shadow-suave sm:p-8">
        <div className="absolute -right-20 -top-20 h-52 w-52 rounded-full bg-brand-primary/15 blur-3xl" aria-hidden="true" />
        <div className="absolute -left-12 bottom-2 h-40 w-40 rounded-full bg-brand-secondary/10 blur-3xl" aria-hidden="true" />

        <div className="relative flex flex-col gap-4">
          <div className="inline-flex w-fit items-center rounded-full border bg-white/80 px-3 py-1 text-xs font-medium text-muted-foreground">
            Operacion interna de catalogo
          </div>
          <div className="space-y-2">
            <h1 className="font-[var(--font-display)] text-3xl tracking-tight sm:text-4xl">Gestor de propiedades</h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Carga una propiedad completa desde esta misma pantalla: datos, hasta 6 imagenes con previsualizacion y luego
              contrato/publicacion desde el editor.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border bg-white/80 px-3 py-1">Maximo 6 imagenes</span>
            <span className="rounded-full border bg-white/80 px-3 py-1">Subida directa por archivo</span>
            <span className="rounded-full border bg-white/80 px-3 py-1">Estado inicial: DRAFT</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader className="space-y-3">
            <CardTitle>Nueva propiedad (inventario interno)</CardTitle>
            <p className="text-sm text-muted-foreground">
              Este flujo evita errores 413: crea la propiedad primero y luego sube cada imagen por separado.
            </p>
          </CardHeader>
          <CardContent>
            <AdminPropertyCreateForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-3xl bg-white/85 shadow-suave">
            <CardHeader>
              <CardTitle>Checklist rapido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">1. Cargar datos base</div>
                <p className="mt-1 text-xs">Titulo, descripcion, estado/ciudad, capacidad y precio.</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">2. Adjuntar imagenes</div>
                <p className="mt-1 text-xs">Selecciona entre 1 y 6 fotos. Tendras previsualizacion antes de guardar.</p>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-medium text-foreground">3. Completar en editor</div>
                <p className="mt-1 text-xs">Sube contrato, revisa detalles y publica cuando este completo.</p>
              </div>
              <div className="rounded-2xl border bg-brand-primary/10 p-4 text-xs text-brand-secondary">
                El catalogo exige contrato + minimo 1 imagen para publicar.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {props.length === 0 ? (
            <div className="text-sm text-muted-foreground">No hay propiedades.</div>
          ) : (
            props.map((p) => (
              <div key={p.id} className="rounded-2xl border bg-white p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-foreground">{p.titulo}</div>
                    <div className="text-sm text-muted-foreground">
                      {p.ciudad}, {p.estadoRegion} · <span className="font-medium">{labelPropertyStatus(p.status)}</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Aliado: {p.allyProfile.user.email} {p.allyProfile.isInternal ? "(interno)" : "(externo)"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Contrato:{" "}
                      <span className="font-medium text-foreground">{p.ownershipContractUrl ? "cargado" : "pendiente"}</span>{" "}
                      · Imagenes: <span className="font-medium text-foreground">{p._count.images}/6</span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">ID: {p.id}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/propiedades/${p.id}`}>Editar / cargar</Link>
                    </Button>
                    {p.status === "PENDING_APPROVAL" ? (
                      <form action={cambiarEstadoPropiedad}>
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="status" value="PUBLISHED" />
                        <Button size="sm" variant="brand" type="submit">
                          Verificar
                        </Button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
