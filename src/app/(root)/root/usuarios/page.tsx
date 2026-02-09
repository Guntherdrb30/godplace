import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { hashPassword } from "@/lib/auth/password";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { labelUserStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Usuarios críticos", path: "/root/usuarios" });

async function crearUsuarioCritico(formData: FormData) {
  "use server";
  const actor = await requireRole(["ROOT"]);

  const email = String(formData.get("email") || "").toLowerCase().trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "");
  const nombre = String(formData.get("nombre") || "").trim() || null;

  if (!email || !email.includes("@")) throw new Error("Correo inválido.");
  if (password.length < 12) throw new Error("Contraseña demasiado corta (mínimo 12).");
  if (!["ADMIN", "ROOT"].includes(role)) throw new Error("Rol inválido.");

  const roleRow = await prisma.role.findUnique({ where: { code: role } });
  if (!roleRow) throw new Error(`Falta rol ${role} (seed).`);

  const passwordHash = await hashPassword(password);
  const u = await prisma.user.create({
    data: {
      email,
      nombre,
      passwordHash,
      roles: { create: [{ roleId: roleRow.id }] },
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "critical_user.create",
    entidadTipo: "user",
    entidadId: u.id,
    metadata: { role },
  });

  revalidatePath("/root/usuarios");
}

export default async function RootUsuariosPage() {
  const criticos = await prisma.user.findMany({
    where: {
      roles: {
        some: {
          role: { code: { in: ["ROOT", "ADMIN"] } },
        },
      },
    },
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">
        Usuarios críticos
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Solo ROOT puede crear más usuarios ROOT/ADMIN.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Crear ADMIN/ROOT</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={crearUsuarioCritico} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre (opcional)</Label>
                <Input id="nombre" name="nombre" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" name="password" type="text" minLength={12} required />
                <p className="text-xs text-muted-foreground">Recomendado: 16+ caracteres.</p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <select id="role" name="role" className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="ADMIN">ADMIN</option>
                  <option value="ROOT">ROOT</option>
                </select>
              </div>
              <Button variant="brand" type="submit">
                Crear usuario crítico
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Listado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticos.map((u) => (
              <div key={u.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{u.email}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Roles: {u.roles.map((r) => r.role.code).join(", ")} · Estado:{" "}
                  {labelUserStatus(u.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
