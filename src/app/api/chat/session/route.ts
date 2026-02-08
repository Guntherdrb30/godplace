import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        reason: "auth_required",
        message: "Necesitas iniciar sesión para crear una sesión de chat.",
      },
      { status: 401 },
    );
  }

  // TODO: integrar ChatKit real: generar/retornar credenciales de sesión por userId.
  // Este endpoint existe para que el embed de ChatKit se conecte al backend.
  return NextResponse.json({
    ok: true,
    userId: user.id,
    provider: "chatkit",
    session: {
      // Placeholder: estructura intencionalmente simple.
      createdAt: new Date().toISOString(),
    },
  });
}
