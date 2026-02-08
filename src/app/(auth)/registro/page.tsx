import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Crear cuenta",
  path: "/registro",
});

export default async function RegistroPage(props: {
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
              Crear cuenta
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Registro con correo y contraseña (MVP).
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-white p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <form action="/api/auth/register" method="post" className="grid gap-4">
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium text-foreground">Tipo de cuenta</legend>
                <p className="text-xs text-muted-foreground">
                  Elige cómo quieres usar Godplaces. Podrás iniciar como cliente y luego convertirte en aliado.
                </p>

                <div className="grid gap-3">
                  <label className="group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-white/90">
                    <input
                      className="peer sr-only"
                      type="radio"
                      name="tipoCuenta"
                      value="CLIENTE"
                      defaultChecked
                    />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-foreground">Cliente</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          Explora y reserva propiedades publicadas en el catálogo.
                        </div>
                      </div>
                      <div className="mt-1 h-4 w-4 rounded-full border border-muted-foreground/40 bg-white peer-checked:border-brand-primary peer-checked:bg-brand-primary" />
                    </div>
                  </label>

                  <label className="group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-white/90">
                    <input className="peer sr-only" type="radio" name="tipoCuenta" value="ALIADO" />
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-foreground">Aliado</div>
                        <div className="mt-1 text-xs leading-5 text-muted-foreground">
                          Publica propiedades y genera ganancias. Requiere verificación (KYC) antes de publicar.
                        </div>
                      </div>
                      <div className="mt-1 h-4 w-4 rounded-full border border-muted-foreground/40 bg-white peer-checked:border-brand-primary peer-checked:bg-brand-primary" />
                    </div>
                  </label>
                </div>
              </fieldset>

              <div className="grid gap-2">
                <Label htmlFor="nombre">Nombre (opcional)</Label>
                <Input id="nombre" name="nombre" type="text" autoComplete="name" />
              </div>
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
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
                <p className="text-xs text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <Button className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]" type="submit">
                Crear cuenta
              </Button>
            </form>

            <p className="mt-5 text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link className="text-foreground underline" href="/login">
                Acceder
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </Container>
  );
}
