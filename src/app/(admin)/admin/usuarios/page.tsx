import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireRole } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/audit";
import { requireTenantId } from "@/lib/tenancy/context";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Usuarios", path: "/admin/usuarios" });

async function toggleEstado(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const userId = String(formData.get("userId") || "");
  const isActive = String(formData.get("isActive") || "") === "1";
  if (!userId) throw new Error("Falta userId.");

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership) throw new Error("Usuario no pertenece al tenant activo.");

  await prisma.tenantMembership.update({
    where: { tenantId_userId: { tenantId, userId } },
    data: { isActive },
  });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "tenant_membership.update_status",
    entidadTipo: "tenant_membership",
    entidadId: membership.id,
    metadata: { userId, isActive },
  });
  revalidatePath("/admin/usuarios");
}

async function resetPassword(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const userId = String(formData.get("userId") || "");
  const newPassword = String(formData.get("newPassword") || "");
  if (!userId) throw new Error("Falta userId.");
  if (newPassword.length < 8) throw new Error("Contraseña demasiado corta (mínimo 8).");

  const membership = await prisma.tenantMembership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
  });
  if (!membership) throw new Error("Usuario no pertenece al tenant activo.");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "user.reset_password",
    entidadTipo: "user",
    entidadId: userId,
  });
  revalidatePath("/admin/usuarios");
}

export default async function AdminUsuariosPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);

  const memberships = await prisma.tenantMembership.findMany({
    where: { tenantId },
    include: { user: { include: { roles: { include: { role: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const users = memberships.map((membership) => ({
    ...membership.user,
    membership,
  }));

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Usuarios</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Gestión operativa: suspender/activar y reset de contraseña (MVP).
      </p>

      <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Correo</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Roles</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.email}</TableCell>
                  <TableCell>{u.nombre || "-"}</TableCell>
                  <TableCell>{u.membership.isActive ? "Activo" : "Suspendido en esta inmobiliaria"}</TableCell>
                  <TableCell>{u.roles.map((r) => r.role.code).join(", ") || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <form action={toggleEstado} className="flex gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        {u.membership.isActive ? (
                          <>
                            <input type="hidden" name="isActive" value="0" />
                            <Button type="submit" variant="outline" size="sm">
                              Suspender en tenant
                            </Button>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="isActive" value="1" />
                            <Button type="submit" variant="outline" size="sm">
                              Activar en tenant
                            </Button>
                          </>
                        )}
                      </form>

                      <form action={resetPassword} className="grid gap-2 w-64">
                        <input type="hidden" name="userId" value={u.id} />
                        <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                        <div className="flex gap-2">
                          <Input name="newPassword" type="text" minLength={8} placeholder="Mínimo 8" />
                          <Button type="submit" size="sm" variant="brand">
                            Reset
                          </Button>
                        </div>
                      </form>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
