import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Container } from "@/components/site/container";

export default async function AdminLayout(props: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "ROOT"]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-[var(--font-display)] text-lg tracking-tight text-marca-petroleo">
              Godplaces<span className="text-marca-turquesa">.</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link className="text-muted-foreground hover:text-foreground" href="/admin">
                Resumen
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/propiedades">
                Propiedades
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/kyc">
                KYC
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/usuarios">
                Usuarios
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/reservas">
                Reservas
              </Link>
            </nav>
          </div>
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/search">
            Ver sitio
          </Link>
        </Container>
      </header>
      <main className="py-10">{props.children}</main>
    </div>
  );
}
