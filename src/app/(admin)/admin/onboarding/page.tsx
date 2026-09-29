import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CheckCircle2, Circle, Building2, UserCog, Users, Home, Megaphone, Store } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { hashPassword } from "@/lib/auth/password";
import { registrarAuditoria } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

async function createFirstAdmin(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);

  const email = String(formData.get("email") || "").trim().toLowerCase();
  const nombre = String(formData.get("nombre") || "").trim();
  const password = String(formData.get("password") || "");

  if (!email || !email.includes("@")) throw new Error("Correo inválido.");
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

  const roleAdmin = await prisma.role.upsert({
    where: { code: "ADMIN" },
    update: { nombre: "ADMIN" },
    create: { code: "ADMIN", nombre: "ADMIN" },
  });

  const user = await prisma.$transaction(async (tx) => {
    const passwordHash = await hashPassword(password);
    const existing = await tx.user.findUnique({ where: { email } });

    const u = existing
      ? await tx.user.update({
          where: { id: existing.id },
          data: {
            nombre: nombre || existing.nombre,
            passwordHash,
            status: "ACTIVE",
          },
        })
      : await tx.user.create({
          data: {
            email,
            nombre: nombre || null,
            passwordHash,
            status: "ACTIVE",
          },
        });

    await tx.userRole.upsert({
      where: { userId_roleId: { userId: u.id, roleId: roleAdmin.id } },
      update: {},
      create: { userId: u.id, roleId: roleAdmin.id },
    });

    await tx.tenantMembership.upsert({
      where: { tenantId_userId: { tenantId, userId: u.id } },
      update: { role: "ADMIN", isActive: true },
      create: {
        tenantId,
        userId: u.id,
        role: "ADMIN",
        isActive: true,
      },
    });

    return u;
  });

  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "tenant_onboarding.admin_create",
    entidadTipo: "user",
    entidadId: user.id,
    metadata: { email: user.email },
  });

  revalidatePath("/admin/onboarding");
  revalidatePath("/admin/usuarios");
}

function StepCard(props: {
  index: number;
  title: string;
  description: string;
  done: boolean;
  href?: string;
  actionLabel?: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <Card className={props.done ? "border-emerald-200 bg-emerald-50/40" : "bg-white/85"}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-xl border bg-white p-2">{props.icon}</div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Paso {props.index}
              </div>
              <CardTitle className="mt-1 text-lg">{props.title}</CardTitle>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{props.description}</p>
            </div>
          </div>
          {props.done ? (
            <Badge className="gap-1 bg-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completo
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Circle className="h-3.5 w-3.5" />
              Pendiente
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {props.children}
        {props.href ? (
          <Button asChild variant={props.done ? "outline" : "brand"} className={props.children ? "mt-4" : ""}>
            <Link href={props.href}>{props.actionLabel || (props.done ? "Revisar" : "Continuar")}</Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function OnboardingPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);

  const [tenant, adminMemberships, agents, properties, listings] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } }),
    prisma.tenantMembership.count({
      where: {
        tenantId,
        isActive: true,
        role: { in: ["OWNER", "ADMIN"] },
      },
    }),
    prisma.agentProfile.count({ where: { tenantId, isActive: true } }),
    prisma.property.count({ where: { tenantId } }),
    prisma.listing.count({ where: { tenantId } }),
  ]);

  const identityDone = Boolean(
    tenant.name &&
      (tenant.logoUrl || tenant.contactEmail || tenant.contactPhone || tenant.contactWhatsapp || tenant.websiteUrl),
  );
  const adminDone = adminMemberships > 0;
  const agentsDone = agents > 0;
  const propertyDone = properties > 0;
  const listingDone = listings > 0;
  const completed = [identityDone, adminDone, agentsDone, propertyDone, listingDone].filter(Boolean).length;
  const isReady = completed === 5;
  const percent = Math.round((completed / 5) * 100);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-sm font-medium text-brand-primary">Onboarding de inmobiliaria</div>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{tenant.name}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Completa estos pasos para dejar la inmobiliaria lista para operar y publicar dentro del marketplace METRORA.
          </p>
        </div>
        <div className="min-w-48 rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between text-sm">
            <span>Progreso</span>
            <span className="font-semibold">{percent}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand-primary" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{completed} de 5 pasos completos</div>
        </div>
      </div>

      {isReady ? (
        <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600" />
            <div>
              <div className="font-semibold text-emerald-950">Inmobiliaria lista para operar</div>
              <p className="mt-1 text-sm leading-6 text-emerald-900/75">
                Ya tiene identidad, administración, al menos un agente, una propiedad y una publicación comercial.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild variant="brand"><Link href="/admin">Ir al dashboard</Link></Button>
                <Button asChild variant="outline"><Link href="/search">Ver marketplace</Link></Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-8 grid gap-5">
        <StepCard
          index={1}
          title="Identidad de la inmobiliaria"
          description="Configura nombre comercial, logo, colores y canales de contacto que aparecerán en sus publicaciones."
          done={identityDone}
          href="/admin/identidad"
          actionLabel={identityDone ? "Revisar identidad" : "Configurar identidad"}
          icon={<Building2 className="h-5 w-5 text-brand-primary" />}
        />

        <StepCard
          index={2}
          title="Administrador"
          description="Asegura que exista al menos un OWNER o ADMIN activo dentro de este tenant."
          done={adminDone}
          href={adminDone ? "/admin/usuarios" : undefined}
          actionLabel="Gestionar usuarios"
          icon={<UserCog className="h-5 w-5 text-brand-primary" />}
        >
          {!adminDone ? (
            <form action={createFirstAdmin} className="grid gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="adminNombre">Nombre</Label>
                <Input id="adminNombre" name="nombre" placeholder="Administrador" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminEmail">Correo</Label>
                <Input id="adminEmail" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="adminPassword">Contraseña inicial</Label>
                <Input id="adminPassword" name="password" type="password" minLength={8} required />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="brand" className="w-full">Crear administrador</Button>
              </div>
            </form>
          ) : (
            <div className="text-sm text-muted-foreground">{adminMemberships} administrador(es) activo(s).</div>
          )}
        </StepCard>

        <StepCard
          index={3}
          title="Equipo de agentes"
          description="Convierte usuarios del tenant en agentes para asignar captaciones, leads, visitas y operaciones."
          done={agentsDone}
          href="/admin/agentes"
          actionLabel={agentsDone ? "Gestionar agentes" : "Agregar primer agente"}
          icon={<Users className="h-5 w-5 text-brand-primary" />}
        >
          {agentsDone ? <div className="text-sm text-muted-foreground">{agents} agente(s) activo(s).</div> : null}
        </StepCard>

        <StepCard
          index={4}
          title="Primera propiedad"
          description="Registra el activo inmobiliario con ubicación, características, imágenes y documentación."
          done={propertyDone}
          href="/admin/propiedades"
          actionLabel={propertyDone ? "Gestionar propiedades" : "Crear primera propiedad"}
          icon={<Home className="h-5 w-5 text-brand-primary" />}
        >
          {propertyDone ? <div className="text-sm text-muted-foreground">{properties} propiedad(es) registrada(s).</div> : null}
        </StepCard>

        <StepCard
          index={5}
          title="Primera publicación"
          description="Crea la oferta comercial de venta o alquiler y publícala para que aparezca en el marketplace METRORA."
          done={listingDone}
          href="/admin/publicaciones"
          actionLabel={listingDone ? "Gestionar publicaciones" : "Crear primera publicación"}
          icon={<Megaphone className="h-5 w-5 text-brand-primary" />}
        >
          {listingDone ? <div className="text-sm text-muted-foreground">{listings} publicación(es) creada(s).</div> : null}
        </StepCard>

        <Card className="border-dashed bg-secondary/20">
          <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Store className="mt-0.5 h-5 w-5 text-brand-primary" />
              <div>
                <div className="font-medium">Marketplace METRORA</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Cuando exista una publicación en estado PUBLISHED, se mostrará automáticamente en el marketplace público.
                </p>
              </div>
            </div>
            <Button asChild variant="outline"><Link href="/search">Abrir marketplace</Link></Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
