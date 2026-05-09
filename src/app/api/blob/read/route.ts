import { head } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { isSensitiveBlobFolder, normalizeBlobPathname, parseBlobPathname } from "@/lib/blob/shared";
import { decryptSensitiveBlob } from "@/lib/blob/sensitive";

export const runtime = "nodejs";

function sanitizeFilename(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._() -]/g, "_") || "documento";
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const pathname = normalizeBlobPathname(searchParams.get("pathname") || "");
    const parsed = parseBlobPathname(pathname);
    if (!parsed || !isSensitiveBlobFolder(parsed.folder)) {
      return NextResponse.json({ ok: false, message: "Pathname invalido." }, { status: 400 });
    }

    const isStaff = user.roles.includes("ADMIN") || user.roles.includes("ROOT");
    let allowed = isStaff;

    if (!allowed && user.roles.includes("ALIADO") && user.allyProfileId) {
      if (parsed.folder === "kyc" || parsed.folder === "ally_contracts") {
        allowed = parsed.entityId === user.allyProfileId;
      } else if (parsed.folder === "property_contracts") {
        const property = await prisma.property.findUnique({
          where: { id: parsed.entityId },
          select: { allyProfileId: true },
        });
        allowed = !!property && property.allyProfileId === user.allyProfileId;
      }
    }

    if (!allowed) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 403 });
    }

    const blob = await head(pathname);
    const remote = await fetch(blob.url, { cache: "no-store" });
    if (!remote.ok) {
      return NextResponse.json({ ok: false, message: "No se pudo leer el documento." }, { status: 502 });
    }

    const sourceBytes = Buffer.from(await remote.arrayBuffer());
    let contentType = blob.contentType || remote.headers.get("content-type") || "application/octet-stream";
    let fileName = parsed.fileName;
    let body: Uint8Array = sourceBytes;

    try {
      const decrypted = decryptSensitiveBlob(sourceBytes);
      contentType = decrypted.contentType;
      fileName = decrypted.fileName;
      body = decrypted.bytes;
    } catch {
      // Compatibilidad con documentos historicos que se subieron sin cifrado.
    }

    const disposition = searchParams.get("download") === "1" ? "attachment" : "inline";
    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `${disposition}; filename="${sanitizeFilename(fileName)}"`,
      "Content-Type": contentType,
    });

    const responseBody = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(Uint8Array.from(body));
        controller.close();
      },
    });

    return new NextResponse(responseBody, { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo abrir el documento.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
