import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findAvailabilityConflict } from "@/lib/booking-availability";
import { prisma } from "@/lib/prisma";
import { cotizarReserva } from "@/lib/pricing";
import { getSiteBranding } from "@/lib/site-branding";

type ChatMsg = { role: "user" | "assistant"; content: string };

const schema = z
  .object({
    message: z.string().trim().min(1).max(2000),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().trim().min(1).max(4000),
        }),
      )
      .max(20)
      .optional(),
  })
  .strict();

function jsonResponse(input: unknown, init?: ResponseInit) {
  return NextResponse.json(input, init);
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta variable de entorno: ${name}`);
  return v;
}

type OpenAIResponse = {
  id: string;
  output?: Array<Record<string, unknown>>;
};

function getNestedErrorMessage(data: Record<string, unknown>): string {
  const err = data.error;
  if (!err || typeof err !== "object") return "";
  const msg = (err as { message?: unknown }).message;
  return typeof msg === "string" ? msg : "";
}

async function crearRespuestaOpenAI(payload: unknown): Promise<OpenAIResponse & Record<string, unknown>> {
  const apiKey = requireEnv("OPENAI_API_KEY");
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = getNestedErrorMessage(data);
    throw new Error(msg || "OpenAI error.");
  }
  return data as unknown as OpenAIResponse & Record<string, unknown>;
}

function extraerTexto(resp: Record<string, unknown>): string {
  const output = Array.isArray(resp.output) ? resp.output : [];
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const it = item as Record<string, unknown>;
    if (it.type !== "message") continue;
    if (it.role !== "assistant") continue;
    const content = Array.isArray(it.content) ? it.content : [];
    for (const c of content) {
      if (!c || typeof c !== "object") continue;
      const ct = c as Record<string, unknown>;
      if (ct.type !== "output_text") continue;
      if (typeof ct.text !== "string") continue;
      parts.push(ct.text);
    }
  }
  return parts.join("\n").trim();
}

function extraerFunctionCalls(resp: Record<string, unknown>) {
  const output = Array.isArray(resp.output) ? resp.output : [];
  return output
    .filter((x) => x && typeof x === "object" && (x as Record<string, unknown>).type === "function_call")
    .map((x) => ({
      call_id: String((x as Record<string, unknown>).call_id || ""),
      name: String((x as Record<string, unknown>).name || ""),
      arguments: String((x as Record<string, unknown>).arguments || "{}"),
    }))
    .filter((x) => x.call_id && x.name);
}

async function tool_search_properties(args: unknown) {
  const parsed = z
    .object({
      ciudad: z.string().trim().max(80).optional(),
      huespedes: z.number().int().min(1).max(50).optional(),
      operationType: z.enum(["SALE","SHORT_RENT","LONG_RENT","COMMERCIAL_RENT"]).optional(),
      propertyType: z.enum(["HOUSE","APARTMENT","TOWNHOUSE","LAND","OFFICE","COMMERCIAL","WAREHOUSE","BUILDING","FARM","HOTEL","VACATION","OTHER"]).optional(),
      limit: z.number().int().min(1).max(60).optional(),
    })
    .default({})
    .safeParse(args);
  if (!parsed.success) throw new Error("Filtros inválidos.");

  const { ciudad, huespedes, operationType, propertyType, limit } = parsed.data;
  const listings = await prisma.listing.findMany({
    where: {
      status: "PUBLISHED",
      ...(operationType ? { operationType } : {}),
      tenant: { is: { status: "ACTIVE" } },
      property: {
        status: "PUBLISHED",
        ...(ciudad ? { ciudad: { contains: ciudad, mode: "insensitive" } } : {}),
        ...(huespedes ? { huespedesMax: { gte: huespedes } } : {}),
        ...(propertyType ? { propertyType } : {}),
      },
    },
    include: {
      tenant: { select: { name: true } },
      property: { include: { images: { orderBy: { orden: "asc" }, take: 1 } } },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take: limit || 12,
  });

  return {
    listings: listings.map((listing) => ({
      listingId: listing.id,
      propertyId: listing.property.id,
      title: listing.title,
      ciudad: listing.property.ciudad,
      estadoRegion: listing.property.estadoRegion,
      huespedesMax: listing.property.huespedesMax,
      propertyType: listing.property.propertyType,
      operationType: listing.operationType,
      currency: listing.currency,
      priceCents: listing.priceCents,
      agencyName: listing.tenant.name,
      imageUrl: listing.property.images[0]?.url ?? null,
      url: `/property/${listing.property.id}?listing=${listing.id}`,
    })),
  };
}

async function tool_get_property(args: unknown) {
  const parsed = z.object({ propertyId: z.string().min(1) }).safeParse(args);
  if (!parsed.success) throw new Error("propertyId inválido.");

  const p = await prisma.property.findUnique({
    where: { id: parsed.data.propertyId },
    include: {
      images: { orderBy: { orden: "asc" } },
      amenities: { include: { amenity: true } },
      tenant: { select: { name: true, status: true } },
      listings: {
        where: { status: "PUBLISHED" },
        orderBy: { updatedAt: "desc" },
      },
    },
  });
  if (!p || p.status !== "PUBLISHED" || p.tenant.status !== "ACTIVE") throw new Error("Propiedad no encontrada.");

  return {
    property: {
      id: p.id,
      titulo: p.titulo,
      descripcion: p.descripcion,
      ciudad: p.ciudad,
      estadoRegion: p.estadoRegion,
      huespedesMax: p.huespedesMax,
      habitaciones: p.habitaciones,
      camas: p.camas,
      banos: p.banos,
      propertyType: p.propertyType,
      agencyName: p.tenant.name,
      images: p.images.map((i) => ({ url: i.url, alt: i.alt, orden: i.orden })),
      amenities: p.amenities.map((pa) => ({ slug: pa.amenity.slug, nombre: pa.amenity.nombre })),
      listings: p.listings.map((listing) => ({
        listingId: listing.id,
        title: listing.title,
        operationType: listing.operationType,
        currency: listing.currency,
        priceCents: listing.priceCents,
        url: `/property/${p.id}?listing=${listing.id}`,
      })),
      url: `/property/${p.id}`,
    },
  };
}

async function tool_quote_booking(args: unknown) {
  const parsed = z
    .object({
      propertyId: z.string().min(1),
      listingId: z.string().min(1),
      checkIn: z.string().min(1),
      checkOut: z.string().min(1),
      guests: z.number().int().min(1).max(50),
    })
    .safeParse(args);
  if (!parsed.success) throw new Error("Datos inválidos.");

  const listing = await prisma.listing.findFirst({
    where: {
      id: parsed.data.listingId,
      propertyId: parsed.data.propertyId,
      status: "PUBLISHED",
      operationType: "SHORT_RENT",
      tenant: { is: { status: "ACTIVE" } },
      property: { status: "PUBLISHED" },
    },
    include: {
      property: { select: { id: true, huespedesMax: true } },
    },
  });
  if (!listing) throw new Error("Publicación de alquiler temporal no encontrada.");
  if (parsed.data.guests > listing.property.huespedesMax) throw new Error("Excede el máximo de huéspedes.");

  const checkIn = new Date(parsed.data.checkIn);
  const checkOut = new Date(parsed.data.checkOut);
  if (!Number.isFinite(checkIn.getTime()) || !Number.isFinite(checkOut.getTime())) throw new Error("Fechas inválidas.");

  const quote = await cotizarReserva({
    pricePerNightCents: listing.priceCents,
    currency: listing.currency,
    checkIn,
    checkOut,
    guests: parsed.data.guests,
  });
  if (quote.nights <= 0) throw new Error("Rango de fechas inválido.");

  const conflict = await findAvailabilityConflict(prisma, {
    propertyId: listing.property.id,
    checkIn,
    checkOut,
  });
  if (conflict) throw new Error(conflict.message);

  return quote;
}

async function ejecutarTool(name: string, args: unknown) {
  if (name === "search_properties") return tool_search_properties(args);
  if (name === "get_property") return tool_get_property(args);
  if (name === "quote_booking") return tool_quote_booking(args);
  throw new Error("Tool no soportado.");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonResponse({ ok: false, message: "Necesitas iniciar sesión." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonResponse({ ok: false, message: "Datos inválidos." }, { status: 400 });

  if (!process.env.OPENAI_API_KEY) {
    return jsonResponse({ ok: false, message: "OPENAI_API_KEY no está configurada en el servidor." }, { status: 500 });
  }

  const branding = await getSiteBranding();
  const model = process.env.OPENAI_MODEL || "gpt-5-mini";

  const instructions = [
    `Eres ${branding.agentName}, un asistente de ${branding.brandName}.`,
    "Tu tarea es asesorar al usuario y ayudarlo a encontrar publicaciones inmobiliarias reales del marketplace.",
    "Distingue venta, alquiler temporal, alquiler residencial y alquiler comercial. Nunca conviertas un precio de venta o alquiler mensual en precio por noche.",
    "Cuando el usuario pida opciones, usa search_properties y devuelve 3-8 publicaciones con links, inmobiliaria, operación y precio.",
    "Si el usuario elige una propiedad o pide detalles, usa get_property y explica sus publicaciones activas.",
    "Solo si la publicación es SHORT_RENT y el usuario da fechas y huéspedes, usa quote_booking para cotizar (solo cálculo, no cobro).",
    "Responde en español. Sé claro, no inventes propiedades ni precios. Si no hay resultados, pide más filtros (ciudad, huéspedes, presupuesto).",
  ].join("\n");

  const history: ChatMsg[] = parsed.data.history || [];
  const inputItems: unknown[] = [];
  for (const m of history) {
    inputItems.push({
      role: m.role,
      content: [{ type: "input_text", text: m.content }],
    });
  }
  inputItems.push({
    role: "user",
    content: [{ type: "input_text", text: parsed.data.message }],
  });

  const tools: unknown[] = [
    {
      type: "function",
      name: "search_properties",
      description: "Busca propiedades publicadas (PUBLISHED) en la base de datos.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          ciudad: { type: "string", description: "Filtro opcional por ciudad (contiene)." },
          huespedes: { type: "integer", description: "Cantidad de huéspedes, útil especialmente para alquiler temporal." },
          operationType: { type: "string", enum: ["SALE","SHORT_RENT","LONG_RENT","COMMERCIAL_RENT"], description: "Tipo de operación comercial." },
          propertyType: { type: "string", enum: ["HOUSE","APARTMENT","TOWNHOUSE","LAND","OFFICE","COMMERCIAL","WAREHOUSE","BUILDING","FARM","HOTEL","VACATION","OTHER"], description: "Tipo de inmueble." },
          limit: { type: "integer", description: "Máximo de resultados (1-60)." },
        },
      },
    },
    {
      type: "function",
      name: "get_property",
      description: "Obtiene el detalle de una propiedad por ID.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          propertyId: { type: "string" },
        },
        required: ["propertyId"],
      },
    },
    {
      type: "function",
      name: "quote_booking",
      description: "Cotiza una reserva (noches, subtotal, fees) para una propiedad.",
      strict: true,
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          propertyId: { type: "string" },
          listingId: { type: "string", description: "ID de una publicación SHORT_RENT." },
          checkIn: { type: "string", description: "Fecha ISO (YYYY-MM-DD o ISO full)." },
          checkOut: { type: "string", description: "Fecha ISO (YYYY-MM-DD o ISO full)." },
          guests: { type: "integer" },
        },
        required: ["propertyId", "listingId", "checkIn", "checkOut", "guests"],
      },
    },
  ];

  const payloadBase = {
    model,
    instructions,
    input: inputItems,
    tools,
  };

  let resp = await crearRespuestaOpenAI(payloadBase);
  for (let i = 0; i < 6; i++) {
    const calls = extraerFunctionCalls(resp);
    if (calls.length === 0) break;

    for (const c of calls) {
      let out = "";
      try {
        const args = JSON.parse(c.arguments || "{}");
        const result = await ejecutarTool(c.name, args);
        out = JSON.stringify({ ok: true, result });
      } catch (e) {
        out = JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "Error." });
      }
      inputItems.push({
        type: "function_call_output",
        call_id: c.call_id,
        output: out,
      });
    }

    resp = await crearRespuestaOpenAI(payloadBase);
  }

  const text = extraerTexto(resp);
  if (!text) {
    return jsonResponse({ ok: false, message: "No se pudo generar respuesta." }, { status: 500 });
  }

  return jsonResponse({ ok: true, text, model });
}
