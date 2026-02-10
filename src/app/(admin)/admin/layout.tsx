import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { getSiteBranding } from "@/lib/site-branding";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

type Counts = {
  pendingWithdrawals: number;
  pendingProperties: number;
  pendingAllyContracts: number;
  pendingKycProfiles: number;
};

function Badge(props: { n: number }) {
  if (props.n <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-[22px] items-center justify-center rounded-full bg-brand-primary px-2 text-[11px] font-semibold text-white">
      {props.n}
    </span>
  );
}

function NavLink(props: {
  href: string;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={props.href}
      className="group flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
    >
      <span className="font-medium">{props.label}</span>
      {typeof props.badge === "number" ? <Badge n={props.badge} /> : null}
    </Link>
  );
}

function AdminNav(props: {
  counts: Counts;
  isRoot: boolean;
}) {
  return (
    <nav className="mt-6 space-y-6">
      <div>
        <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Operación
        </div>
        <div className="mt-2 space-y-1">
          <NavLink href="/admin" label="Resumen" />
          <NavLink
            href="/admin/propiedades"
            label="Propiedades"
            badge={props.counts.pendingProperties}
          />
          <NavLink href="/admin/reservas" label="Reservas" />
          <NavLink
            href="/admin/withdrawals"
            label="Retiros"
            badge={props.counts.pendingWithdrawals}
          />
        </div>
      </div>

      <div>
        <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Aliados
        </div>
        <div className="mt-2 space-y-1">
          <NavLink
            href="/admin/aliados"
            label="Contratos"
            badge={props.counts.pendingAllyContracts}
          />
          <NavLink
            href="/admin/kyc"
            label="KYC"
            badge={props.counts.pendingKycProfiles}
          />
        </div>
      </div>

      <div>
        <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Sistema
        </div>
        <div className="mt-2 space-y-1">
          <NavLink href="/admin/usuarios" label="Usuarios" />
          <NavLink href="/admin/visual" label="Visual" />
        </div>
      </div>

      {props.isRoot ? (
        <div>
          <div className="px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            ROOT (crítico)
          </div>
          <div className="mt-2 space-y-1">
            <NavLink href="/root" label="ROOT resumen" />
            <NavLink href="/root/usuarios" label="Usuarios críticos" />
            <NavLink href="/root/configuracion" label="Configuración" />
            <NavLink href="/root/auditoria" label="Auditoría" />
          </div>
        </div>
      ) : null}

      <div className="px-3 pt-3">
        <div className="h-px bg-border" />
        <div className="mt-3 flex items-center gap-2">
          <Button asChild variant="outline" className="w-full justify-start">
            <Link href="/search">Ver sitio</Link>
          </Button>
        </div>
        <form action="/api/auth/logout" method="post" className="mt-2">
          <Button type="submit" variant="outline" className="w-full justify-start">
            Cerrar sesión
          </Button>
        </form>
      </div>
    </nav>
  );
}

export default async function AdminLayout(props: { children: React.ReactNode }) {
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const isRoot = actor.roles.includes("ROOT");
  const branding = await getSiteBranding();

  const counts: Counts = {
    pendingWithdrawals: 0,
    pendingProperties: 0,
    pendingAllyContracts: 0,
    pendingKycProfiles: 0,
  };

  try {
    const [w, p, c, k] = await Promise.all([
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.property.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.allyContract.count({ where: { status: "PENDING" } }),
      prisma.allyProfile.count({ where: { status: "PENDING_KYC" } }),
    ]);
    counts.pendingWithdrawals = w;
    counts.pendingProperties = p;
    counts.pendingAllyContracts = c;
    counts.pendingKycProfiles = k;
  } catch {
    // Keep zeros if DB isn't reachable.
  }

  return (
    <div className="min-h-screen">
      <div className="flex">
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r bg-white/70 px-4 py-5 backdrop-blur lg:block">
          <Link href="/" className="flex items-center gap-3 rounded-2xl px-2 py-2 hover:bg-secondary/40">
            <Image
              src={branding.logoUrl || "/logo-godplaces-placeholder.svg"}
              alt={`Logo de ${branding.brandName}.`}
              width={34}
              height={34}
              priority
              unoptimized
            />
            <div className="leading-tight">
              <div className="font-[var(--font-display)] text-lg tracking-tight text-brand-secondary">
                {branding.brandName}
                <span className="text-brand-primary">.</span>
              </div>
              <div className="text-xs text-muted-foreground">
                Dashboard {isRoot ? "ROOT" : "ADMIN"}
              </div>
            </div>
          </Link>

          <AdminNav counts={counts} isRoot={isRoot} />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-40 border-b bg-white/70 backdrop-blur lg:hidden">
            <div className="flex h-14 items-center justify-between px-4">
              <div className="flex items-center gap-3">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Abrir menú">
                      <Menu className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[320px] p-4">
                    <div className="flex items-center gap-3">
                      <Image
                        src={branding.logoUrl || "/logo-godplaces-placeholder.svg"}
                        alt={`Logo de ${branding.brandName}.`}
                        width={34}
                        height={34}
                        priority
                        unoptimized
                      />
                      <div className="leading-tight">
                        <div className="font-[var(--font-display)] text-lg tracking-tight text-brand-secondary">
                          {branding.brandName}
                          <span className="text-brand-primary">.</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Dashboard {isRoot ? "ROOT" : "ADMIN"}
                        </div>
                      </div>
                    </div>
                    <AdminNav counts={counts} isRoot={isRoot} />
                  </SheetContent>
                </Sheet>

                <div className="font-medium text-foreground">Administración</div>
              </div>

              <div className="text-xs text-muted-foreground">
                {actor.nombre || actor.email}
              </div>
            </div>
          </header>

          <main className="px-4 py-6 lg:px-10 lg:py-10">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
