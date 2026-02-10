import { NextResponse } from "next/server";
import { z } from "zod";
import { del } from "@vercel/blob";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";
import { getDefaultBranding } from "@/lib/site-branding";

const hslTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/, "Formato esperado: 'H S% L%'.")
  .refine((v) => {
    const [hRaw, sRaw, lRaw] = v.split(/\s+/);
    const h = Number(hRaw);
    const s = Number(String(sRaw).replace("%", ""));
    const l = Number(String(lRaw).replace("%", ""));
    return (
      Number.isFinite(h) &&
      h >= 0 &&
      h <= 360 &&
      Number.isFinite(s) &&
      s >= 0 &&
      s <= 100 &&
      Number.isFinite(l) &&
      l >= 0 &&
      l <= 100
    );
  }, "Valores HSL fuera de rango.");

const schema = z
  .object({
    brandName: z.string().trim().min(1).max(60).optional(),
    agentName: z.string().trim().min(1).max(40).optional(),
    logoUrl: z.string().trim().min(1).max(2048).optional(),
    logoPathname: z.string().trim().min(1).max(2048).nullable().optional(),
    colors: z
      .object({
        primaryHsl: hslTokenSchema.optional(),
        secondaryHsl: hslTokenSchema.optional(),
      })
      .optional(),
  })
  .strict();

export async function POST(req: Request) {
  const actor = await getCurrentUser();
  if (!actor || !actor.roles.includes("ROOT")) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const base = getDefaultBranding();

  const currentRow = await prisma.systemSetting.findUnique({ where: { key: "site_branding" } });
  const currentValue =
    currentRow && typeof currentRow.value === "object" && currentRow.value !== null
      ? (currentRow.value as Record<string, unknown>)
      : {};

  const colorsRaw =
    typeof currentValue.colors === "object" && currentValue.colors !== null
      ? (currentValue.colors as Record<string, unknown>)
      : {};

  const current = {
    brandName: typeof currentValue.brandName === "string" ? currentValue.brandName : base.brandName,
    agentName: typeof currentValue.agentName === "string" ? currentValue.agentName : base.agentName,
    logoUrl: typeof currentValue.logoUrl === "string" ? currentValue.logoUrl : base.logoUrl,
    logoPathname:
      typeof currentValue.logoPathname === "string" ? currentValue.logoPathname : base.logoPathname,
    colors: {
      primaryHsl:
        typeof colorsRaw.primaryHsl === "string" ? colorsRaw.primaryHsl : base.colors.primaryHsl,
      secondaryHsl:
        typeof colorsRaw.secondaryHsl === "string" ? colorsRaw.secondaryHsl : base.colors.secondaryHsl,
    },
  };

  const next = {
    brandName: parsed.data.brandName ?? current.brandName,
    agentName: parsed.data.agentName ?? current.agentName,
    logoUrl: parsed.data.logoUrl ?? current.logoUrl,
    logoPathname:
      typeof parsed.data.logoPathname === "undefined" ? current.logoPathname : parsed.data.logoPathname,
    colors: {
      primaryHsl: parsed.data.colors?.primaryHsl ?? current.colors.primaryHsl,
      secondaryHsl: parsed.data.colors?.secondaryHsl ?? current.colors.secondaryHsl,
    },
  };

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const prev = current.logoPathname;
    const nextPath = next.logoPathname;
    if (prev && nextPath && prev !== nextPath) {
      await del(prev).catch(() => {});
    }
  }

  await prisma.systemSetting.upsert({
    where: { key: "site_branding" },
    update: {
      value: next as Prisma.InputJsonValue,
      updatedByUserId: actor.id,
    },
    create: {
      key: "site_branding",
      value: next as Prisma.InputJsonValue,
      updatedByUserId: actor.id,
    },
  });

  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "site_branding.update",
    entidadTipo: "system_setting",
    entidadId: "site_branding",
    metadata: next as Prisma.InputJsonValue,
  });

  return NextResponse.json({ ok: true, branding: next });
}
