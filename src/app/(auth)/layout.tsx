import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/site/container";

export default function AuthLayout(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-white/70 backdrop-blur">
        <Container className="flex h-16 items-center justify-between">
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
          <Link className="text-sm text-muted-foreground hover:text-foreground" href="/search">
            Explorar
          </Link>
        </Container>
      </header>
      <main>{props.children}</main>
    </div>
  );
}
