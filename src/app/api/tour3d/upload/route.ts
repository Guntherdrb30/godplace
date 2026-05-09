import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { TOUR_ALLOWED_FILE_TYPES, TOUR_BLOB_BASE_PATH, TOUR_MAX_FILE_SIZE_BYTES } from "@/lib/tour3d/upload-config";

const payloadSchema = z.object({
  sessionId: z.string().min(1).max(120),
  purpose: z.literal("tour3d-demo"),
});

function parseClientPayload(input: string | null) {
  if (!input) {
    throw new Error("Falta clientPayload para upload de recorrido 3D.");
  }

  const raw = JSON.parse(input) as unknown;
  return payloadSchema.parse(raw);
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: "Falta BLOB_READ_WRITE_TOKEN en el entorno. El client upload a Blob no puede inicializarse.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const parsedPayload = parseClientPayload(clientPayload);
        const expectedPrefix = `${TOUR_BLOB_BASE_PATH}/${parsedPayload.sessionId}/`;

        if (!pathname.startsWith(expectedPrefix)) {
          throw new Error("Pathname de upload no autorizado para demo 3D.");
        }

        return {
          allowedContentTypes: [...TOUR_ALLOWED_FILE_TYPES],
          maximumSizeInBytes: TOUR_MAX_FILE_SIZE_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify(parsedPayload),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo preparar el client upload.",
      },
      { status: 400 },
    );
  }
}
