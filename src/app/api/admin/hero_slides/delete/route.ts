import { NextResponse } from "next/server";
import { z } from "zod";
import { del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { registrarAuditoria } from "@/lib/audit";

const schema = z.object({
  id: z.string().min(1),
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

  const slide = await prisma.heroSlide.findUnique({ where: { id: parsed.data.id } });
  if (!slide) return NextResponse.json({ ok: false, message: "No existe." }, { status: 404 });

  await prisma.heroSlide.delete({ where: { id: slide.id } });

  // Best-effort: borrar el blob asociado.
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    await del(slide.imagePathname).catch(() => {});
  }

  await registrarAuditoria({
    actorUserId: user.id,
    accion: "hero_slide.delete",
    entidadTipo: "hero_slide",
    entidadId: slide.id,
    metadata: { pathname: slide.imagePathname },
  });

  return NextResponse.json({ ok: true });
}

