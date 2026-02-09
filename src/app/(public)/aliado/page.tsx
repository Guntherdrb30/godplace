import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { registrarAuditoria } from "@/lib/audit";

export const metadata = buildMetadata({ title: "Aliados", path: "/aliado" });

async function iniciarProceso() {
  "use server";
  const user = await requireUser();

  // En producción, `prisma db seed` puede no ejecutarse. Garantizamos el rol ALIADO de forma idempotente.
  const roleAliado = await prisma.role.upsert({
    where: { code: "ALIADO" },
    update: { nombre: "ALIADO" },
    create: { code: "ALIADO", nombre: "ALIADO" },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: roleAliado.id } },
    update: {},
    create: { userId: user.id, roleId: roleAliado.id },
  });

  const ally = await prisma.allyProfile.upsert({
    where: { userId: user.id },
    update: { status: "PENDING_KYC" },
    create: { userId: user.id, status: "PENDING_KYC", isInternal: false },
  });

  await prisma.allyWallet.upsert({
    where: { allyProfileId: ally.id },
    update: {},
    create: { allyProfileId: ally.id },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "ally.start_kyc",
    entidadTipo: "ally_profile",
    entidadId: ally.id,
  });

  redirect("/aliado/contrato");
}

export default function AliadoPage() {
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Ser aliado</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Registra tus propiedades en Godplaces. Para publicar, necesitas verificación
          manual (KYC) y aprobación del operador central.
        </p>

        <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle>Verificación (KYC)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Documentos mínimos:</p>
            <ul className="list-disc pl-5">
              <li>Cédula</li>
              <li>RIF</li>
              <li>Selfie con cédula</li>
              <li>Documento de propiedad o poder</li>
            </ul>
            <form action={iniciarProceso}>
              <Button className="mt-4 bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" type="submit">
                Iniciar proceso
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
