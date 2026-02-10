import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Container } from "@/components/site/container";
import { getSiteBranding } from "@/lib/site-branding";

export default async function RootAreaLayout(props: { children: React.ReactNode }) {
  await requireRole(["ROOT"]);
  const branding = await getSiteBranding();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-[var(--font-display)] text-lg tracking-tight text-marca-petroleo">
              {branding.brandName}
              <span className="text-marca-turquesa">.</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link className="text-muted-foreground hover:text-foreground" href="/root">
                Resumen
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/root/usuarios">
                Usuarios críticos
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/root/branding">
                Branding
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/root/configuracion">
                Configuración
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/root/auditoria">
                Auditoría
              </Link>
            </nav>
          </div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/admin">
            Ir a Admin
          </Link>
        </Container>
      </header>
      <main className="py-10">{props.children}</main>
    </div>
  );
}
