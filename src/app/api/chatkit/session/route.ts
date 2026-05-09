import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const runtime = "nodejs";

type ChatKitSessionRequest = {
  currentClientSecret?: string;
};

type ChatKitSessionPayload = {
  user: string;
  workflow: {
    id: string;
    version?: string;
  };
};

type ChatKitSessionApiResponse = {
  client_secret?: {
    value?: string;
  };
};

function parseRequestBody(input: unknown): ChatKitSessionRequest {
  if (!input || typeof input !== "object") return {};
  const currentClientSecret =
    typeof (input as { currentClientSecret?: unknown }).currentClientSecret === "string"
      ? String((input as { currentClientSecret: string }).currentClientSecret)
      : undefined;
  return { currentClientSecret };
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      {
        ok: false,
        reason: "auth_required",
        message: "Necesitas iniciar sesion para usar el asistente.",
      },
      { status: 401 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const workflowId = process.env.CHATKIT_WORKFLOW_ID;
  const workflowVersion = process.env.CHATKIT_WORKFLOW_VERSION?.trim();

  if (!apiKey) {
    return NextResponse.json({ ok: false, message: "Falta OPENAI_API_KEY en el servidor." }, { status: 500 });
  }
  if (!workflowId) {
    return NextResponse.json({ ok: false, message: "Falta CHATKIT_WORKFLOW_ID en el servidor." }, { status: 500 });
  }

  const input = parseRequestBody(await req.json().catch(() => null));
  const currentClientSecret = input.currentClientSecret ?? null;
  void currentClientSecret;

  const payload: ChatKitSessionPayload = {
    user: user.id,
    workflow: {
      id: workflowId,
      ...(workflowVersion ? { version: workflowVersion } : {}),
    },
  };

  const res = await fetch("https://api.openai.com/v1/chatkit/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "OpenAI-Beta": "chatkit_beta=v1",
    },
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => null)) as ChatKitSessionApiResponse | Record<string, unknown> | null;
  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        message: "No se pudo crear la sesion de ChatKit.",
        status: res.status,
        detail: data,
      },
      { status: 500 },
    );
  }

  const clientSecret =
    data && "client_secret" in data && data.client_secret && typeof data.client_secret === "object"
      ? (data.client_secret as { value?: unknown }).value
      : null;

  if (typeof clientSecret !== "string" || !clientSecret) {
    return NextResponse.json(
      { ok: false, message: "Respuesta invalida: falta client_secret." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, client_secret: clientSecret });
}
