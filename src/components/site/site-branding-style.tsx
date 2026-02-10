import { getSiteBranding } from "@/lib/site-branding";

export async function SiteBrandingStyle() {
  const b = await getSiteBranding();

  const css = `:root{--marca-turquesa:${b.colors.primaryHsl};--marca-petroleo:${b.colors.secondaryHsl};--marca-cta:var(--marca-turquesa);--brand-primary:var(--marca-turquesa);--brand-secondary:var(--marca-petroleo);--brand-accent:var(--marca-cta);--primary:var(--marca-petroleo);--ring:var(--marca-turquesa);}`;

  return <style id="site-branding" dangerouslySetInnerHTML={{ __html: css }} />;
}

