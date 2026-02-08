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
import type { UserStatus } from "@prisma/client";
import { labelUserStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Usuarios", path: "/admin/usuarios" });

async function toggleEstado(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const userId = String(formData.get("userId") || "");
  const status = String(formData.get("status") || "");
  if (!userId) throw new Error("Falta userId.");
  if (!["ACTIVE", "SUSPENDED"].includes(status)) throw new Error("Estado inválido.");

  await prisma.user.update({ where: { id: userId }, data: { status: status as UserStatus } });
  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "user.update_status",
    entidadTipo: "user",
    entidadId: userId,
    metadata: { status },
  });
  revalidatePath("/admin/usuarios");
}

async function resetPassword(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const userId = String(formData.get("userId") || "");
  const newPassword = String(formData.get("newPassword") || "");
  if (!userId) throw new Error("Falta userId.");
  if (newPassword.length < 8) throw new Error("Contraseña demasiado corta (mínimo 8).");

  const passwordHash = await hashPassword(newPassword);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "user.reset_password",
    entidadTipo: "user",
    entidadId: userId,
  });
  revalidatePath("/admin/usuarios");
}

export default async function AdminUsuariosPage() {
  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

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
                  <TableCell>{labelUserStatus(u.status)}</TableCell>
                  <TableCell>{u.roles.map((r) => r.role.code).join(", ") || "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-2">
                      <form action={toggleEstado} className="flex gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        {u.status !== "SUSPENDED" ? (
                          <>
                            <input type="hidden" name="status" value="SUSPENDED" />
                            <Button type="submit" variant="outline" size="sm">
                              Suspender
                            </Button>
                          </>
                        ) : (
                          <>
                            <input type="hidden" name="status" value="ACTIVE" />
                            <Button type="submit" variant="outline" size="sm">
                              Activar
                            </Button>
                          </>
                        )}
                      </form>

                      <form action={resetPassword} className="grid gap-2 w-64">
                        <input type="hidden" name="userId" value={u.id} />
                        <Label className="text-xs text-muted-foreground">Nueva contraseña</Label>
                        <div className="flex gap-2">
                          <Input name="newPassword" type="text" minLength={8} placeholder="Mínimo 8" />
                          <Button type="submit" size="sm" className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]">
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
