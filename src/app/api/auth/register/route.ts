import { NextResponse } from "next/server";
import { z } from "zod";
import { del, put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { crearSesion, setCookieSesion } from "@/lib/auth/sessions";
import { firmarRbacToken } from "@/lib/auth/rbac-token";
import { setCookieRbac } from "@/lib/auth/rbac-cookie";
import { sendEmail } from "@/lib/email";
import { buildAllyContractEmail } from "@/lib/contracts/ally";

const schema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9._-]+$/, "El usuario solo puede contener letras minúsculas, números, punto, guión y guion bajo.")
      .min(3)
      .max(30)
      .optional(),
    nombre: z.string().trim().max(120).optional(),
    apellido: z.string().trim().max(120).optional(),
    fechaNacimiento: z.string().trim().optional(),
    sexo: z.enum(["M", "F", "O"]).optional(),
    telefono: z.string().trim().max(60).optional(),
    email: z.string().email(),
    password: z.string().min(8),
    passwordConfirm: z.string().min(8),
    tipoCuenta: z.enum(["CLIENTE", "ALIADO"]).default("CLIENTE"),
    isCompany: z.boolean().default(false),
    companyName: z.string().trim().max(200).optional(),
    rifNumber: z.string().trim().max(60).optional(),
    acceptTerms: z.boolean().default(false),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Las contraseñas no coinciden.",
  })
  .superRefine((d, ctx) => {
    if (d.tipoCuenta === "ALIADO") {
      if (!d.username) ctx.addIssue({ code: "custom", path: ["username"], message: "Usuario requerido para aliados." });
      if (!d.nombre) ctx.addIssue({ code: "custom", path: ["nombre"], message: "Nombre requerido." });
      if (!d.apellido) ctx.addIssue({ code: "custom", path: ["apellido"], message: "Apellido requerido." });
      if (!d.fechaNacimiento) ctx.addIssue({ code: "custom", path: ["fechaNacimiento"], message: "Fecha de nacimiento requerida." });
      if (!d.sexo) ctx.addIssue({ code: "custom", path: ["sexo"], message: "Sexo requerido." });
      if (!d.telefono) ctx.addIssue({ code: "custom", path: ["telefono"], message: "Teléfono requerido." });
      if (!d.acceptTerms) ctx.addIssue({ code: "custom", path: ["acceptTerms"], message: "Debes aceptar las condiciones." });

      if (d.isCompany) {
        if (!d.companyName) ctx.addIssue({ code: "custom", path: ["companyName"], message: "Nombre de empresa requerido." });
        if (!d.rifNumber) ctx.addIssue({ code: "custom", path: ["rifNumber"], message: "RIF requerido." });
      }
    }
  });

function redirectConError(req: Request, msg: string) {
  const url = new URL("/registro", req.url);
  url.searchParams.set("error", msg);
  return NextResponse.redirect(url, { status: 303 });
}

function parseDateOnly(s: string): Date | null {
  const v = s.trim();
  if (!v) return null;
  // Expect yyyy-mm-dd
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isUploadablePdfOrImage(file: File): boolean {
  const ct = (file.type || "").toLowerCase();
  if (!ct) return true; // Allow when browser omits content-type
  return ct.startsWith("image/") || ct === "application/pdf";
}

async function uploadKycFile(input: { allyProfileId: string; file: File; prefix: string }) {
  const maxBytes = 15 * 1024 * 1024; // 15MB
  if (typeof input.file.size === "number" && input.file.size > maxBytes) {
    throw new Error("Archivo demasiado grande (máx. 15MB).");
  }
  if (!isUploadablePdfOrImage(input.file)) {
    throw new Error("Tipo de archivo no permitido. Usa PDF o imagen.");
  }

  const safeName = (input.file.name || "archivo").replace(/[^a-zA-Z0-9._-]/g, "_");
  const pathname = `kyc/${input.allyProfileId}/${input.prefix}_${safeName}`;

  const res = await put(pathname, input.file, {
    access: "public",
    addRandomSuffix: true,
    contentType: input.file.type || undefined,
  });

  return { url: res.url, pathname: res.pathname };
}

export async function POST(req: Request) {
  const form = await req.formData();

  const parsed = schema.safeParse({
    username: String(form.get("username") || "").trim() || undefined,
    nombre: String(form.get("nombre") || "").trim() || undefined,
    apellido: String(form.get("apellido") || "").trim() || undefined,
    fechaNacimiento: String(form.get("fechaNacimiento") || "").trim() || undefined,
    sexo: String(form.get("sexo") || "").trim() || undefined,
    telefono: String(form.get("telefono") || "").trim() || undefined,
    email: String(form.get("email") || "").toLowerCase().trim(),
    password: String(form.get("password") || ""),
    passwordConfirm: String(form.get("passwordConfirm") || ""),
    tipoCuenta: String(form.get("tipoCuenta") || "").toUpperCase().trim() || undefined,
    isCompany: String(form.get("isCompany") || "") === "1",
    companyName: String(form.get("companyName") || "").trim() || undefined,
    rifNumber: String(form.get("rifNumber") || "").trim() || undefined,
    acceptTerms: String(form.get("acceptTerms") || "") === "1",
  });
  if (!parsed.success) return redirectConError(req, parsed.error.issues[0]?.message || "Datos inválidos.");

  const dob = parsed.data.fechaNacimiento ? parseDateOnly(parsed.data.fechaNacimiento) : null;
  if (parsed.data.tipoCuenta === "ALIADO" && !dob) {
    return redirectConError(req, "Fecha de nacimiento inválida.");
  }

  const passwordHash = await hashPassword(parsed.data.password);

  try {
    const user = await prisma.$transaction(async (tx) => {
      // En producción, `prisma db seed` puede no ejecutarse. Para que el registro funcione
      // siempre, garantizamos roles base de forma idempotente.
      const roleCliente = await tx.role.upsert({
        where: { code: "CLIENTE" },
        update: { nombre: "CLIENTE" },
        create: { code: "CLIENTE", nombre: "CLIENTE" },
      });

      const rolesCreate: { roleId: string }[] = [{ roleId: roleCliente.id }];

      let allyProfile:
        | {
            create: {
              status: "PENDING_KYC";
              isInternal: false;
              wallet: { create: Record<string, never> };
              firstName: string;
              lastName: string;
              dateOfBirth: Date;
              sex: string;
              phone: string;
              contactEmail: string;
              isCompany: boolean;
              companyName?: string | null;
              rifNumber?: string | null;
              termsAcceptedAt: Date;
              termsVersion: string;
            };
          }
        | undefined;

      if (parsed.data.tipoCuenta === "ALIADO") {
        const roleAliado = await tx.role.upsert({
          where: { code: "ALIADO" },
          update: { nombre: "ALIADO" },
          create: { code: "ALIADO", nombre: "ALIADO" },
        });
        rolesCreate.push({ roleId: roleAliado.id });
        allyProfile = {
          create: {
            status: "PENDING_KYC",
            isInternal: false,
            wallet: { create: {} },
            firstName: parsed.data.nombre || "",
            lastName: parsed.data.apellido || "",
            dateOfBirth: dob!,
            sex: parsed.data.sexo || "",
            phone: parsed.data.telefono || "",
            contactEmail: parsed.data.email,
            isCompany: parsed.data.isCompany,
            companyName: parsed.data.isCompany ? parsed.data.companyName || null : null,
            rifNumber: parsed.data.isCompany ? parsed.data.rifNumber || null : null,
            termsAcceptedAt: new Date(),
            termsVersion: "v1",
          },
        };
      }

      return tx.user.create({
        data: {
          email: parsed.data.email,
          username: parsed.data.username,
          nombre: parsed.data.nombre,
          passwordHash,
          roles: { create: rolesCreate },
          allyProfile,
        },
        include: { roles: { include: { role: true } }, allyProfile: true },
      });
    });

    // Si es aliado: exigir documentos KYC en el registro (cédula, selfie y RIF si aplica).
    if (parsed.data.tipoCuenta === "ALIADO" && user.allyProfile) {
      const cedula = form.get("kycCedula");
      const selfie = form.get("kycSelfieCedula");
      const rif = form.get("kycRif");

      if (!(cedula instanceof File) || cedula.size === 0) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        return redirectConError(req, "Falta el documento: cédula.");
      }
      if (!(selfie instanceof File) || selfie.size === 0) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        return redirectConError(req, "Falta el documento: selfie con cédula.");
      }
      if (parsed.data.isCompany && (!(rif instanceof File) || rif.size === 0)) {
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        return redirectConError(req, "Falta el documento: RIF (empresa).");
      }

      const uploadedPathnames: string[] = [];
      try {
        const uCedula = await uploadKycFile({ allyProfileId: user.allyProfile.id, file: cedula, prefix: "CEDULA" });
        uploadedPathnames.push(uCedula.pathname);
        const uSelfie = await uploadKycFile({ allyProfileId: user.allyProfile.id, file: selfie, prefix: "SELFIE_CEDULA" });
        uploadedPathnames.push(uSelfie.pathname);

        const docs: Array<{ type: "CEDULA" | "RIF" | "SELFIE_CEDULA"; url: string; pathname: string }> = [
          { type: "CEDULA", url: uCedula.url, pathname: uCedula.pathname },
          { type: "SELFIE_CEDULA", url: uSelfie.url, pathname: uSelfie.pathname },
        ];

        if (parsed.data.isCompany && rif instanceof File) {
          const uRif = await uploadKycFile({ allyProfileId: user.allyProfile.id, file: rif, prefix: "RIF" });
          uploadedPathnames.push(uRif.pathname);
          docs.push({ type: "RIF", url: uRif.url, pathname: uRif.pathname });
        }

        await prisma.$transaction(async (tx) => {
          for (const d of docs) {
            await tx.kycDocument.create({
              data: {
                allyProfileId: user.allyProfile!.id,
                type: d.type,
                url: d.url,
                pathname: d.pathname,
                status: "PENDING",
              },
            });
          }
        });
      } catch (e) {
        // Best-effort cleanup: borrar blobs subidos y eliminar el usuario creado.
        await Promise.all(uploadedPathnames.map((p) => del(p).catch(() => {})));
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        console.warn("[KYC][WARN] Falló registro KYC durante alta de aliado:", e);
        return redirectConError(req, "No se pudo completar el registro KYC. Intenta de nuevo.");
      }
    }

    if (parsed.data.tipoCuenta === "ALIADO" && user.allyProfile) {
      const email = buildAllyContractEmail({
        allyProfileId: user.allyProfile.id,
        firstName: user.allyProfile.firstName || parsed.data.nombre || "",
        lastName: user.allyProfile.lastName || parsed.data.apellido || "",
        email: user.email,
        username: user.username || parsed.data.username || user.email,
        phone: user.allyProfile.phone || parsed.data.telefono || "",
        isCompany: user.allyProfile.isCompany,
        companyName: user.allyProfile.companyName,
        rifNumber: user.allyProfile.rifNumber,
        dateOfBirth: parsed.data.fechaNacimiento || null,
        sex: parsed.data.sexo || null,
      });

      await sendEmail({ to: user.email, subject: email.subject, text: email.text }).catch((e) => {
        console.warn("[EMAIL][WARN] Falló envío de contrato de aliado:", e);
      });
    }

    const roles = user.roles.map((ur) => ur.role.code);
    const { token, expiresAt } = await crearSesion(user.id);
    await setCookieSesion(token, expiresAt);
    const rbac = await firmarRbacToken({ userId: user.id, roles });
    await setCookieRbac(rbac, expiresAt);

    const nextUrl = parsed.data.tipoCuenta === "ALIADO" ? "/aliado/contrato" : "/";
    return NextResponse.redirect(new URL(nextUrl, req.url), { status: 303 });
  } catch (e: unknown) {
    const code =
      typeof e === "object" && e && typeof (e as { code?: unknown }).code === "string"
        ? String((e as { code?: unknown }).code)
        : null;
    const msg =
      code === "P2002"
        ? "Ese correo o usuario ya está registrado."
        : "No se pudo crear la cuenta.";
    return redirectConError(req, msg);
  }
}
