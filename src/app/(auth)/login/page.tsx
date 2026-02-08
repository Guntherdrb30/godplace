import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Acceder",
  path: "/login",
});

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await props.searchParams;
  const error = typeof sp.error === "string" ? sp.error : "";

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md">
        <Card className="rounded-3xl bg-white/85 shadow-suave">
          <CardHeader>
            <CardTitle className="font-[var(--font-display)] text-2xl tracking-tight">
              Acceder
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Ingresa con tu correo y contraseña.
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-white p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form action="/api/auth/login" method="post" className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Correo</Label>
                <Input id="email" name="email" type="email" autoComplete="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]" type="submit">
                Entrar
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link className="text-foreground underline" href="/registro">
                Crear cuenta
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
