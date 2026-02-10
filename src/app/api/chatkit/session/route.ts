import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        reason: "auth_required",
        message: "Necesitas iniciar sesión para usar el asistente.",
      },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.CHATKIT_WORKFLOW_ID;
  const workflowVersion = process.env.CHATKIT_WORKFLOW_VERSION?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, message: "Falta OPENAI_API_KEY en el servidor." },
      { status: 500 },
    );
  }
  if (!workflowId) {
    return NextResponse.json(
      { ok: false, message: "Falta CHATKIT_WORKFLOW_ID en el servidor." },
      { status: 500 },
    );
  }

  const input = await req.json().catch(() => ({} as unknown));
  const currentClientSecret =
    typeof (input as any)?.currentClientSecret === "string"
      ? String((input as any).currentClientSecret)
      : null;

  // ChatKit se encarga del thread/historial; cuando expire el client_secret,
  // pedirá uno nuevo. Si recibimos uno anterior, generamos una sesión nueva.
  // (Mantener continuidad depende de la configuración interna de ChatKit.)
  void currentClientSecret;

  const body: any = {
    user: user.id,
    workflow: {
      id: workflowId,
    },
  };
  if (workflowVersion) body.workflow.version = workflowVersion;

  const res = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo crear la sesión de ChatKit.",
        status: res.status,
        detail: data,
      },
      { status: 500 },
    );
  }

  const clientSecret = (data as any)?.client_secret?.value;
  if (!clientSecret) {
    return NextResponse.json(
      { ok: false, message: "Respuesta inválida: falta client_secret." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, client_secret: clientSecret });
}

