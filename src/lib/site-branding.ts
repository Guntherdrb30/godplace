import { unstable_noStore as noStore } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { dbDisponible } from "@/lib/db";

export type SiteBranding = {
  brandName: string;
  agentName: string;
  logoUrl: string;
  logoPathname: string | null;
  colors: {
    primaryHsl: string;
    secondaryHsl: string;
  };
};

const DEFAULT_BRANDING: SiteBranding = {
  brandName: "Godplaces",
  agentName: "God",
  logoUrl: "/logo-godplaces-placeholder.svg",
  logoPathname: null,
  colors: {
    primaryHsl: "176 57% 45%",
    secondaryHsl: "188 100% 17%",
  },
};

const hslTokenSchema = z
  .string()
  .trim()
  .regex(/^\d{1,3}\s+\d{1,3}%\s+\d{1,3}%$/, "Formato esperado: 'H S% L%'.")
  .refine((v) => {
    const [hRaw, sRaw, lRaw] = v.split(/\s+/);
    const h = Number(hRaw);
    const s = Number(String(sRaw).replace("%", ""));
    const l = Number(String(lRaw).replace("%", ""));
    return (
      Number.isFinite(h) &&
      h >= 0 &&
      h <= 360 &&
      Number.isFinite(s) &&
      s >= 0 &&
      s <= 100 &&
      Number.isFinite(l) &&
      l >= 0 &&
      l <= 100
    );
  }, "Valores HSL fuera de rango.");

const brandingValueSchema = z
  .object({
    brandName: z.string().trim().min(1).max(60).optional(),
    agentName: z.string().trim().min(1).max(40).optional(),
    logoUrl: z.string().trim().min(1).max(2048).optional(),
    logoPathname: z.string().trim().min(1).max(2048).nullable().optional(),
    colors: z
      .object({
        primaryHsl: hslTokenSchema.optional(),
        secondaryHsl: hslTokenSchema.optional(),
      })
      .optional(),
  })
  .strict();

export async function getSiteBranding(): Promise<SiteBranding> {
  noStore();
  if (!dbDisponible()) return DEFAULT_BRANDING;
  try {
    const s = await prisma.systemSetting.findUnique({ where: { key: "site_branding" } });
    const parsed = brandingValueSchema.safeParse(s?.value ?? {});
    if (!parsed.success) return DEFAULT_BRANDING;

    return {
      brandName: parsed.data.brandName ?? DEFAULT_BRANDING.brandName,
      agentName: parsed.data.agentName ?? DEFAULT_BRANDING.agentName,
      logoUrl: parsed.data.logoUrl ?? DEFAULT_BRANDING.logoUrl,
      logoPathname:
        typeof parsed.data.logoPathname === "undefined"
          ? DEFAULT_BRANDING.logoPathname
          : (parsed.data.logoPathname ?? null),
      colors: {
        primaryHsl: parsed.data.colors?.primaryHsl ?? DEFAULT_BRANDING.colors.primaryHsl,
        secondaryHsl: parsed.data.colors?.secondaryHsl ?? DEFAULT_BRANDING.colors.secondaryHsl,
      },
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

export function getDefaultBranding(): SiteBranding {
  return DEFAULT_BRANDING;
}
