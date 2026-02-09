import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  urlOrPathname: z.string().min(1),
});

function extractPathname(urlOrPathname: string): string {
  const v = urlOrPathname.trim();
  if (!v) return "";
  if (v.startsWith("http://") || v.startsWith("https://")) {
    try {
      const u = new URL(v);
      return u.pathname.replace(/^\/+/, "");
    } catch {
      return v.replace(/^\/+/, "");
    }
  }
  return v.replace(/^\/+/, "");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos invÃ¡lidos." }, { status: 400 });
  }

  const pathname = extractPathname(parsed.data.urlOrPathname);
  if (!pathname) {
    return NextResponse.json({ ok: false, message: "Pathname invÃ¡lido." }, { status: 400 });
  }

  const isStaff = user.roles.includes("ADMIN") || user.roles.includes("ROOT");
  if (!isStaff) {
    // Aliado: solo puede borrar blobs propios (KYC, contrato, y archivos de sus propiedades).
    if (!user.roles.includes("ALIADO") || !user.allyProfileId) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }

    const allowPrefixes = [
      `kyc/${user.allyProfileId}/`,
      `ally_contracts/${user.allyProfileId}/`,
    ];
    const allowedDirect = allowPrefixes.some((p) => pathname.startsWith(p));

    let allowedProperty = false;
    const m = pathname.match(/^(properties|property_contracts)\/([^/]+)\//);
    if (m) {
      const propertyId = m[2];
      const prop = await prisma.property.findUnique({
        where: { id: propertyId },
        select: { allyProfileId: true },
      });
      allowedProperty = !!prop && prop.allyProfileId === user.allyProfileId;
    }

    if (!allowedDirect && !allowedProperty) {
      return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
    }
  }

  await del(pathname);
  return NextResponse.json({ ok: true });
}
