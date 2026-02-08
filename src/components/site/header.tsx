import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur">
      <Container className="flex h-16 items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo-godplaces-placeholder.svg"
              alt="Logo de Godplaces."
              width={34}
              height={34}
              priority
            />
            <span className="font-[var(--font-display)] text-lg tracking-tight text-marca-petroleo">
              Godplaces<span className="text-marca-turquesa">.</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            <Link className="text-muted-foreground hover:text-foreground" href="/search">
              Explorar
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/aliado">
              Ser aliado
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/#como-funciona">
              Cómo funciona
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/#seguridad">
              Verificación
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Acceder</Link>
              </Button>
              <Button asChild className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]">
                <Link href="/registro">Crear cuenta</Link>
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="border-border">
                  {user.nombre || user.email}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem asChild>
                  <Link href="/search">Explorar</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/aliado">Ser aliado</Link>
                </DropdownMenuItem>
                {user.roles.includes("ALIADO") && (
                  <DropdownMenuItem asChild>
                    <Link href="/aliado/kyc">Mi verificación (KYC)</Link>
                  </DropdownMenuItem>
                )}
                {user.roles.includes("ALIADO") && (
                  <DropdownMenuItem asChild>
                    <Link href="/aliado/propiedades">Mis propiedades</Link>
                  </DropdownMenuItem>
                )}
                {(user.roles.includes("ADMIN") || user.roles.includes("ROOT")) && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Administración</Link>
                  </DropdownMenuItem>
                )}
                {user.roles.includes("ROOT") && (
                  <DropdownMenuItem asChild>
                    <Link href="/root">ROOT</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action="/api/auth/logout" method="post">
                    <button className="w-full text-left">Cerrar sesión</button>
                  </form>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </Container>
    </header>
  );
}
