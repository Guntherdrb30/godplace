import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { registrarAuditoria } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Configuración", path: "/root/configuracion" });

async function guardar(formData: FormData) {
  "use server";
  const actor = await requireRole(["ROOT"]);
  const platformFeeRate = Number.parseFloat(String(formData.get("platform_fee_rate") || "0.12"));
  const currencyDefault = String(formData.get("currency_default") || "USD").trim().toUpperCase();

  const rate = Number.isFinite(platformFeeRate) ? Math.min(Math.max(platformFeeRate, 0), 0.5) : 0.12;
  if (!currencyDefault) throw new Error("Moneda inválida.");

  await prisma.systemSetting.upsert({
    where: { key: "platform_fee_rate" },
    update: { value: rate as Prisma.InputJsonValue, updatedByUserId: actor.id },
    create: { key: "platform_fee_rate", value: rate as Prisma.InputJsonValue, updatedByUserId: actor.id },
  });
  await prisma.systemSetting.upsert({
    where: { key: "currency_default" },
    update: { value: currencyDefault as Prisma.InputJsonValue, updatedByUserId: actor.id },
    create: { key: "currency_default", value: currencyDefault as Prisma.InputJsonValue, updatedByUserId: actor.id },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "system_settings.update",
    entidadTipo: "system_setting",
    entidadId: "platform_fee_rate,currency_default",
    metadata: { platform_fee_rate: rate, currency_default: currencyDefault },
  });

  revalidatePath("/root/configuracion");
}

export default async function RootConfiguracionPage() {
  const settings = await prisma.systemSetting.findMany();
  const fee = settings.find((s) => s.key === "platform_fee_rate")?.value;
  const cur = settings.find((s) => s.key === "currency_default")?.value;

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Configuración global</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Configuración crítica (solo ROOT).
      </p>

      <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Parámetros</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={guardar} className="grid gap-5 max-w-xl">
            <div className="grid gap-2">
              <Label htmlFor="platform_fee_rate">Fee plataforma (0 a 0.5)</Label>
              <Input
                id="platform_fee_rate"
                name="platform_fee_rate"
                type="number"
                step="0.01"
                min="0"
                max="0.5"
                defaultValue={typeof fee === "number" ? String(fee) : "0.12"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency_default">Moneda por defecto</Label>
              <Input
                id="currency_default"
                name="currency_default"
                type="text"
                defaultValue={typeof cur === "string" ? cur : "USD"}
              />
            </div>
            <Button variant="brand" type="submit">
              Guardar
            </Button>
          </form>
        </CardContent>
      </Card>
    </Container>
  );
}
