import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const metaSchema = z.object({
  folder: z.enum(["properties", "property_contracts", "kyc", "ally_contracts", "site"]),
  entityId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
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

    const isAliadoContract =
      !!user &&
      user.roles.includes("ALIADO") &&
      meta.data.folder === "ally_contracts" &&
      !!user.allyProfileId &&
      meta.data.entityId === user.allyProfileId;

    let isAliadoProperty = false;
    if (
      !isStaff &&
      !!user &&
      user.roles.includes("ALIADO") &&
      (meta.data.folder === "properties" || meta.data.folder === "property_contracts") &&
      !!user.allyProfileId
    ) {
      const prop = await prisma.property.findUnique({
        where: { id: meta.data.entityId },
        select: { allyProfileId: true },
      });
      isAliadoProperty = !!prop && prop.allyProfileId === user.allyProfileId;
    }

    if (!isStaff && !isAliadoKyc && !isAliadoContract && !isAliadoProperty) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, message: "Falta archivo." }, { status: 400 });
    }

    const maxBytes = 15 * 1024 * 1024; // 15MB (validación funcional; runtime puede imponer menos).
    if (typeof file.size === "number" && file.size > maxBytes) {
      return NextResponse.json({ ok: false, message: "Archivo demasiado grande (máx. 15MB)." }, { status: 400 });
    }

    const ct = (file.type || "").toLowerCase();
    const isImage = ct.startsWith("image/");
    const isPdf = ct === "application/pdf";
    const folderKey = meta.data.folder;
    const needsImageOnly = folderKey === "properties" || folderKey === "site";
    const allowsPdfOrImage =
      folderKey === "kyc" || folderKey === "ally_contracts" || folderKey === "property_contracts";

    if (ct) {
      if (needsImageOnly && !isImage) {
        return NextResponse.json({ ok: false, message: "Tipo de archivo no permitido. Debe ser imagen." }, { status: 400 });
      }
      if (allowsPdfOrImage && !(isImage || isPdf)) {
        return NextResponse.json({ ok: false, message: "Tipo de archivo no permitido. Usa PDF o imagen." }, { status: 400 });
      }
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
  } catch (e) {
    const message = e instanceof Error ? e.message : "No se pudo procesar el archivo.";
    const lower = message.toLowerCase();
    const isTooLarge = lower.includes("too large") || message.includes("413");
    return NextResponse.json(
      {
        ok: false,
        message: isTooLarge
          ? "Archivo demasiado grande para el servidor. Usa un archivo menor a 4MB."
          : "Error interno al subir el archivo.",
      },
      { status: isTooLarge ? 413 : 500 }
    );
  }
}
