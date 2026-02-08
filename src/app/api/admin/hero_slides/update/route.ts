import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
  title: z.string().trim().max(120).nullable().optional(),
  subtitle: z.string().trim().max(240).nullable().optional(),
  ctaText: z.string().trim().max(80).nullable().optional(),
  ctaHref: z.string().trim().max(300).nullable().optional(),
  orden: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  if (!isStaff) return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  const { id, ...rest } = parsed.data;
  const data: {
    title?: string | null;
    subtitle?: string | null;
    ctaText?: string | null;
    ctaHref?: string | null;
    orden?: number;
    active?: boolean;
  } = {};

  if (typeof rest.title !== "undefined") data.title = rest.title;
  if (typeof rest.subtitle !== "undefined") data.subtitle = rest.subtitle;
  if (typeof rest.ctaText !== "undefined") data.ctaText = rest.ctaText;
  if (typeof rest.ctaHref !== "undefined") data.ctaHref = rest.ctaHref;
  if (typeof rest.orden !== "undefined") data.orden = rest.orden;
  if (typeof rest.active !== "undefined") data.active = rest.active;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ ok: false, message: "No hay cambios." }, { status: 400 });
  }

  await prisma.heroSlide.update({ where: { id }, data });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "hero_slide.update",
    entidadTipo: "hero_slide",
    entidadId: id,
    metadata: data,
  });

  return NextResponse.json({ ok: true });
}
