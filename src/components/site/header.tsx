import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/site/container";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const allyAccess =
    user?.allyProfileId && user.roles.includes("ALIADO")
      ? await prisma.allyProfile
          .findUnique({
            where: { id: user.allyProfileId },
            select: { status: true, contract: { select: { status: true } } },
          })
          .catch(() => null)
      : null;
  const allyApproved =
    !!allyAccess &&
    allyAccess.status === "KYC_APPROVED" &&
    allyAccess.contract?.status === "APPROVED";

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
            <span className="font-[var(--font-display)] text-lg tracking-tight text-brand-secondary">
              Godplaces<span className="text-brand-primary">.</span>
            </span>
          </Link>
          <nav aria-label="NavegaciÃ³n principal" className="hidden items-center gap-6 text-sm sm:flex">
            <Link className="text-muted-foreground hover:text-foreground" href="/search">
              Explorar
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/aliado">
              Ser aliado
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/#como-funciona">
              CÃ³mo funciona
            </Link>
            <Link className="text-muted-foreground hover:text-foreground" href="/#seguridad">
              VerificaciÃ³n
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {!user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Acceder</Link>
              </Button>
              <Button asChild variant="brand">
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
                {user.roles.includes("ALIADO") ? (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/aliado/contrato">Mi contrato</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/aliado/kyc">Mi verificaciÃ³n (KYC)</Link>
                    </DropdownMenuItem>
                    {allyApproved ? (
                      <>
                        <DropdownMenuItem asChild>
                          <Link href="/aliado/propiedades">Mis propiedades</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href="/aliado/billetera">Mi billetera</Link>
                        </DropdownMenuItem>
                      </>
                    ) : null}
                  </>
                ) : null}
                {user.roles.includes("ADMIN") || user.roles.includes("ROOT") ? (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">AdministraciÃ³n</Link>
                  </DropdownMenuItem>
                ) : null}
                {user.roles.includes("ROOT") ? (
                  <DropdownMenuItem asChild>
                    <Link href="/root">ROOT</Link>
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <form action="/api/auth/logout" method="post">
                    <button className="w-full text-left">Cerrar sesiÃ³n</button>
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
