import Link from "next/link";
import { requireRole } from "@/lib/auth/guards";
import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";

export default async function AdminLayout(props: { children: React.ReactNode }) {
  await requireRole(["ADMIN", "ROOT"]);

  let pendingWithdrawals = 0;
  let pendingProperties = 0;
  let pendingAllyContracts = 0;
  let pendingKycProfiles = 0;

  try {
    const [w, p, c, k] = await Promise.all([
      prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
      prisma.property.count({ where: { status: "PENDING_APPROVAL" } }),
      prisma.allyContract.count({ where: { status: "PENDING" } }),
      prisma.allyProfile.count({ where: { status: "PENDING_KYC" } }),
    ]);
    pendingWithdrawals = w;
    pendingProperties = p;
    pendingAllyContracts = c;
    pendingKycProfiles = k;
  } catch {
    pendingWithdrawals = 0;
    pendingProperties = 0;
    pendingAllyContracts = 0;
    pendingKycProfiles = 0;
  }

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
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/aliados">
                Aliados{" "}
                {pendingAllyContracts > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-2 text-xs font-semibold text-white">
                    {pendingAllyContracts}
                  </span>
                ) : null}
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/propiedades">
                Propiedades{" "}
                {pendingProperties > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-2 text-xs font-semibold text-white">
                    {pendingProperties}
                  </span>
                ) : null}
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/kyc">
                KYC{" "}
                {pendingKycProfiles > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-2 text-xs font-semibold text-white">
                    {pendingKycProfiles}
                  </span>
                ) : null}
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/usuarios">
                Usuarios
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/reservas">
                Reservas
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/visual">
                Visual
              </Link>
              <Link className="text-muted-foreground hover:text-foreground" href="/admin/withdrawals">
                Retiros{" "}
                {pendingWithdrawals > 0 ? (
                  <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-primary px-2 text-xs font-semibold text-white">
                    {pendingWithdrawals}
                  </span>
                ) : null}
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
