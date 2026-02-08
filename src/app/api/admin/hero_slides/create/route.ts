import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  title: z.string().trim().max(120).optional(),
  subtitle: z.string().trim().max(240).optional(),
  ctaText: z.string().trim().max(80).optional(),
  ctaHref: z.string().trim().max(300).optional(),
  imageUrl: z.string().url(),
  imagePathname: z.string().min(1),
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

  let orden = parsed.data.orden;
  if (typeof orden !== "number") {
    const max = await prisma.heroSlide.aggregate({ _max: { orden: true } });
    orden = (max._max.orden ?? -1) + 1;
  }

  const slide = await prisma.heroSlide.create({
    data: {
      title: parsed.data.title || null,
      subtitle: parsed.data.subtitle || null,
      ctaText: parsed.data.ctaText || null,
      ctaHref: parsed.data.ctaHref || null,
      imageUrl: parsed.data.imageUrl,
      imagePathname: parsed.data.imagePathname,
      orden,
      active: parsed.data.active ?? true,
    },
  });

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "hero_slide.create",
    entidadTipo: "hero_slide",
    entidadId: slide.id,
    metadata: { orden: slide.orden, active: slide.active },
  });

  return NextResponse.json({
    ok: true,
    slide: {
      id: slide.id,
      title: slide.title,
      subtitle: slide.subtitle,
      ctaText: slide.ctaText,
      ctaHref: slide.ctaHref,
      imageUrl: slide.imageUrl,
      imagePathname: slide.imagePathname,
      orden: slide.orden,
      active: slide.active,
      createdAt: slide.createdAt.toISOString(),
      updatedAt: slide.updatedAt.toISOString(),
    },
  });
}

