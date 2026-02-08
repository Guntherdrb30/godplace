import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const metaSchema = z.object({
  folder: z.enum(["properties", "kyc", "site"]),
  entityId: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const form = await req.formData();
  const file = form.get("file");
  const folder = String(form.get("folder") || "");
  const entityId = String(form.get("entityId") || "");

  const meta = metaSchema.safeParse({ folder, entityId });
  if (!meta.success) {
    return NextResponse.json({ ok: false, message: "Metadatos inválidos." }, { status: 400 });
  }

  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  const isAliadoKyc =
    !!user &&
    user.roles.includes("ALIADO") &&
    meta.data.folder === "kyc" &&
    !!user.allyProfileId &&
    meta.data.entityId === user.allyProfileId;

  let isAliadoProperty = false;
  if (!isStaff && !!user && user.roles.includes("ALIADO") && meta.data.folder === "properties" && !!user.allyProfileId) {
    const prop = await prisma.property.findUnique({
      where: { id: meta.data.entityId },
      select: { allyProfileId: true },
    });
    isAliadoProperty = !!prop && prop.allyProfileId === user.allyProfileId;
  }

  // `site`: solo ADMIN/ROOT.
  if (!isStaff && !isAliadoKyc && !isAliadoProperty) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, message: "Falta archivo." }, { status: 400 });
  }

  const safeName = (file.name || "archivo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `${meta.data.folder}/${meta.data.entityId}/${safeName}`;

  const res = await put(pathname, file, {
    access: "public",
    addRandomSuffix: true,
    contentType: file.type || undefined,
  });

  return NextResponse.json({
    ok: true,
    url: res.url,
    pathname: res.pathname,
    contentType: res.contentType,
  });
}

