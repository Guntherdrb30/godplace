import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";

const schema = z.object({
  urlOrPathname: z.string().min(1),
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  const isStaff = !!user && (user.roles.includes("ADMIN") || user.roles.includes("ROOT"));
  if (!isStaff) {
    return NextResponse.json({ ok: false, message: "No autorizado." }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Datos inválidos." }, { status: 400 });
  }

  await del(parsed.data.urlOrPathname);
  return NextResponse.json({ ok: true });
}

