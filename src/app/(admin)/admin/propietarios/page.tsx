import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/guards";
import { requireTenantId } from "@/lib/tenancy/context";
import { prisma } from "@/lib/prisma";
import { registrarAuditoria } from "@/lib/audit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function createOwner(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const displayName = String(formData.get("displayName") || "").trim();
  const companyName = String(formData.get("companyName") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const idNumber = String(formData.get("idNumber") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;
  if (!displayName) throw new Error("Falta nombre del propietario.");

  const owner = await prisma.ownerProfile.create({
    data: { tenantId, displayName, companyName, email, phone, idNumber, notes },
  });
  await registrarAuditoria({
    tenantId,
    actorUserId: actor.id,
    accion: "owner.create",
    entidadTipo: "owner_profile",
    entidadId: owner.id,
  });
  revalidatePath("/admin/propietarios");
}

export default async function OwnersPage() {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const tenantId = requireTenantId(actor);
  const owners = await prisma.ownerProfile.findMany({
    where: { tenantId },
    include: { _count: { select: { properties: true, deals: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Propietarios</h1>
      <p className="mt-2 text-sm text-muted-foreground">Cartera de propietarios de la inmobiliaria activa.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <Card>
          <CardHeader><CardTitle>Nuevo propietario</CardTitle></CardHeader>
          <CardContent>
            <form action={createOwner} className="grid gap-4">
              <div className="grid gap-2"><Label htmlFor="displayName">Nombre</Label><Input id="displayName" name="displayName" required /></div>
              <div className="grid gap-2"><Label htmlFor="companyName">Empresa</Label><Input id="companyName" name="companyName" /></div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
                <div className="grid gap-2"><Label htmlFor="phone">Teléfono</Label><Input id="phone" name="phone" /></div>
              </div>
              <div className="grid gap-2"><Label htmlFor="idNumber">Cédula / RIF</Label><Input id="idNumber" name="idNumber" /></div>
              <div className="grid gap-2"><Label htmlFor="notes">Notas</Label><Textarea id="notes" name="notes" rows={4} /></div>
              <Button type="submit" variant="brand">Crear propietario</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cartera</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {owners.length === 0 ? <p className="text-sm text-muted-foreground">No hay propietarios registrados.</p> : owners.map((owner) => (
              <div key={owner.id} className="rounded-2xl border bg-white p-4">
                <div className="font-medium">{owner.displayName}</div>
                <div className="mt-1 text-sm text-muted-foreground">{owner.companyName || "Persona natural"} · {owner.phone || owner.email || "Sin contacto"}</div>
                <div className="mt-2 text-xs text-muted-foreground">Propiedades: {owner._count.properties} · Operaciones: {owner._count.deals}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
