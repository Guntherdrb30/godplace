import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function createAgent(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const userId = String(formData.get("userId") || "").trim();
  const displayName = String(formData.get("displayName") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const licenseNumber = String(formData.get("licenseNumber") || "").trim() || null;
  if (!userId) throw new Error("Selecciona un usuario.");

  const membership = await prisma.tenantMembership.findFirst({
    where: { tenantId, userId, isActive: true },
  });
  if (!membership) throw new Error("Usuario no pertenece al tenant activo.");

  const agent = await prisma.agentProfile.upsert({
    where: { tenantId_userId: { tenantId, userId } },
    update: { displayName, phone, licenseNumber, isActive: true },
    create: { tenantId, userId, displayName, phone, licenseNumber, isActive: true },
  });
  await prisma.tenantMembership.update({
    where: { tenantId_userId: { tenantId, userId } },
    data: { role: "AGENT" },
  });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "agent.upsert",
    entidadTipo: "agent_profile",
    entidadId: agent.id,
  });
  revalidatePath("/admin/agentes");
}

export default async function AgentsPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const [memberships, agents] = await Promise.all([
    prisma.tenantMembership.findMany({
      where: { tenantId, isActive: true },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.agentProfile.findMany({
      where: { tenantId },
      include: { user: true, _count: { select: { properties: true, leads: true, deals: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Agentes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Convierte usuarios del tenant en agentes inmobiliarios.</p>
      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Asignar agente</CardTitle></CardHeader>
          <CardContent>
            <form action={createAgent} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="userId">Usuario</Label>
                <select id="userId" name="userId" required className="h-10 rounded-md border bg-white px-3 text-sm">
                  <option value="">Seleccionar</option>
                  {memberships.map((m) => <option key={m.userId} value={m.userId}>{m.user.nombre || m.user.email}</option>)}
                </select>
              </div>
              <div className="grid gap-2"><Label htmlFor="displayName">Nombre comercial</Label><Input id="displayName" name="displayName" /></div>
              <div className="grid gap-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" /></div>
              <div className="grid gap-2"><Label htmlFor="licenseNumber">Licencia / registro</Label><Input id="licenseNumber" name="licenseNumber" /></div>
              <Button type="submit" variant="brand">Guardar agente</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Equipo comercial</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {agents.length === 0 ? <p className="text-sm text-muted-foreground">No hay agentes configurados.</p> : agents.map((agent) => (
              <div key={agent.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{agent.displayName || agent.user.nombre || agent.user.email}</div>
                <div className="mt-1 text-sm text-muted-foreground">{agent.phone || agent.user.email}</div>
                <div className="mt-2 text-xs text-muted-foreground">Propiedades: {agent._count.properties} · Leads: {agent._count.leads} · Operaciones: {agent._count.deals}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
