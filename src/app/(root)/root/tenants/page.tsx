import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Container } from "@/components/site/container";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { COOKIE_ACTIVE_TENANT } from "@/lib/tenancy/cookies";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Inmobiliarias", path: "/root/tenants" });

function normalizeSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
}

async function crearTenant(formData: FormData) {
  "use server";
  const actor = await requireRole(["ROOT"]);

  const name = String(formData.get("name") || "").trim();
  const legalName = String(formData.get("legalName") || "").trim() || null;
  const slug = normalizeSlug(String(formData.get("slug") || name));

  if (!name) throw new Error("Falta nombre de la inmobiliaria.");
  if (!slug || slug.length < 2) throw new Error("Slug invalido.");

  const tenant = await prisma.$transaction(async (tx) => {
    const created = await tx.tenant.create({
      data: {
        name,
        legalName,
        slug,
        status: "ACTIVE",
        isDefault: false,
      },
    });

    await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId: created.id, userId: actor.id } },
      update: { role: "OWNER", isActive: true },
      create: {
        tenantId: created.id,
        userId: actor.id,
        role: "OWNER",
        isActive: true,
      },
    });

    return created;
  });

  await registrarAuditoria({
    tenantId: tenant.id,
    actorUserId: actor.id,
    accion: "tenant.create",
    entidadTipo: "tenant",
    entidadId: tenant.id,
    metadata: { slug: tenant.slug, name: tenant.name },
  });

  revalidatePath("/root/tenants");
  revalidatePath("/root");
}

async function cambiarTenant(formData: FormData) {
  "use server";
  const actor = await requireRole(["ROOT"]);
  const tenantId = String(formData.get("tenantId") || "").trim();
  if (!tenantId) throw new Error("Falta tenantId.");

  const membership = await prisma.tenantMembership.findFirst({
    where: {
      tenantId,
      userId: actor.id,
      isActive: true,
      tenant: { status: "ACTIVE" },
    },
  });
  if (!membership) throw new Error("No tienes acceso a ese tenant.");

  const jar = await cookies();
  jar.set(COOKIE_ACTIVE_TENANT, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  redirect("/admin");
}

async function toggleTenant(formData: FormData) {
  "use server";
  const actor = await requireRole(["ROOT"]);
  const tenantId = String(formData.get("tenantId") || "").trim();
  const nextStatus = String(formData.get("status") || "").trim();
  if (!tenantId) throw new Error("Falta tenantId.");
  if (!["ACTIVE", "SUSPENDED"].includes(nextStatus)) throw new Error("Estado invalido.");

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("Tenant no encontrado.");
  if (tenant.isDefault && nextStatus === "SUSPENDED") {
    throw new Error("El tenant interno por defecto no puede suspenderse.");
  }

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { status: nextStatus as "ACTIVE" | "SUSPENDED" },
  });

  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "tenant.update_status",
    entidadTipo: "tenant",
    entidadId: tenantId,
    metadata: { status: nextStatus },
  });

  revalidatePath("/root/tenants");
}

export default async function RootTenantsPage() {
  const actor = await requireRole(["ROOT"]);
  const tenants = await prisma.tenant.findMany({
    include: {
      _count: {
        select: {
          memberships: true,
          properties: true,
          bookings: true,
        },
      },
      memberships: {
        where: { userId: actor.id },
        select: { role: true, isActive: true },
      },
    },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <Container>
      <div>
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Inmobiliarias / Tenants</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Crea y administra las empresas que operan dentro de METRORA.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Nueva inmobiliaria</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearTenant} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre comercial</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="legalName">Razon social</Label>
                <Input id="legalName" name="legalName" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="slug">Slug (opcional)</Label>
                <Input id="slug" name="slug" placeholder="inmobiliaria-ejemplo" />
              </div>
              <Button type="submit" variant="brand">
                Crear inmobiliaria
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Tenants</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tenants.map((tenant) => {
              const ownMembership = tenant.memberships[0] || null;
              return (
                <div key={tenant.id} className="rounded-2xl border bg-white p-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-medium text-foreground">
                        {tenant.name} {tenant.isDefault ? "(interno)" : ""}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {tenant.slug} · {tenant.status}
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        Usuarios: {tenant._count.memberships} · Propiedades: {tenant._count.properties} · Reservas: {tenant._count.bookings}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Tu acceso: {ownMembership ? `${ownMembership.role} · ${ownMembership.isActive ? "activo" : "inactivo"}` : "sin membresia"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {ownMembership?.isActive && tenant.status === "ACTIVE" ? (
                        <form action={cambiarTenant}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <Button type="submit" size="sm" variant="brand">
                            Administrar
                          </Button>
                        </form>
                      ) : null}

                      {!tenant.isDefault ? (
                        <form action={toggleTenant}>
                          <input type="hidden" name="tenantId" value={tenant.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE"}
                          />
                          <Button type="submit" size="sm" variant="outline">
                            {tenant.status === "ACTIVE" ? "Suspender" : "Activar"}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
