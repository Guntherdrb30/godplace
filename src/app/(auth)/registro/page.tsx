import { Container } from "@/components/site/container";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";

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
              Registro con usuario/correo y contraseÃ±a.
            </p>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="mb-4 rounded-xl border border-destructive/30 bg-white p-3 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            <RegisterForm />

            <p className="mt-5 text-sm text-muted-foreground">
              Â¿Ya tienes cuenta?{" "}
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
