"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/auth/password-input";

export function RegisterForm() {
  const [tipo, setTipo] = React.useState<"CLIENTE" | "ALIADO">("CLIENTE");
  const [isCompany, setIsCompany] = React.useState(false);

  return (
    <form action="/api/auth/register" method="post" encType="multipart/form-data" className="grid gap-4">
      <fieldset className="grid gap-3">
        <legend className="text-sm font-medium text-foreground">Tipo de cuenta</legend>
        <p className="text-xs text-muted-foreground">
          Elige cÃ³mo quieres usar Godplaces. Si eliges <span className="font-medium text-foreground">Aliado</span>,
          deberÃ¡s completar un proceso de verificaciÃ³n y firma de contrato. Crear el usuario no garantiza aprobaciÃ³n.
        </p>

        <div className="grid gap-3">
          <label className="group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-white/90">
            <input
              className="peer sr-only"
              type="radio"
              name="tipoCuenta"
              value="CLIENTE"
              defaultChecked
              onChange={() => setTipo("CLIENTE")}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-foreground">Cliente</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Explora y reserva propiedades publicadas en el catÃ¡logo.
                </div>
              </div>
              <div className="mt-1 h-4 w-4 rounded-full border border-muted-foreground/40 bg-white peer-checked:border-brand-primary peer-checked:bg-brand-primary" />
            </div>
          </label>

          <label className="group cursor-pointer rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-white/90">
            <input
              className="peer sr-only"
              type="radio"
              name="tipoCuenta"
              value="ALIADO"
              onChange={() => setTipo("ALIADO")}
            />
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-medium text-foreground">Aliado</div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Publica propiedades y genera ganancias. Requiere verificaciÃ³n (KYC) y aprobaciÃ³n manual.
                </div>
              </div>
              <div className="mt-1 h-4 w-4 rounded-full border border-muted-foreground/40 bg-white peer-checked:border-brand-primary peer-checked:bg-brand-primary" />
            </div>
          </label>
        </div>
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="username">Usuario</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Ej: juan.perez"
          required={tipo === "ALIADO"}
        />
        <p className="text-xs text-muted-foreground">
          Puedes iniciar sesiÃ³n con correo o usuario. (Obligatorio para aliados.)
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="nombre">Nombre</Label>
          <Input id="nombre" name="nombre" type="text" autoComplete="given-name" required={tipo === "ALIADO"} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="apellido">Apellido</Label>
          <Input id="apellido" name="apellido" type="text" autoComplete="family-name" required={tipo === "ALIADO"} />
        </div>
      </div>

      {tipo === "ALIADO" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="fechaNacimiento">Fecha de nacimiento</Label>
            <Input id="fechaNacimiento" name="fechaNacimiento" type="date" required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sexo">Sexo</Label>
            <select id="sexo" name="sexo" className="h-10 rounded-md border bg-white px-3 text-sm" required>
              <option value="">Selecciona...</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Correo</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="telefono">TelÃ©fono de contacto</Label>
          <Input id="telefono" name="telefono" type="tel" autoComplete="tel" required={tipo === "ALIADO"} placeholder="Ej: +58 412 123 4567" />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="password">ContraseÃ±a</Label>
        <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
        <p className="text-xs text-muted-foreground">MÃ­nimo 8 caracteres.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="passwordConfirm">Repetir contraseÃ±a</Label>
        <PasswordInput id="passwordConfirm" name="passwordConfirm" autoComplete="new-password" minLength={8} required />
      </div>

      {tipo === "ALIADO" ? (
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-sm font-medium text-foreground">Datos de aliado</div>
          <div className="mt-3 grid gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="isCompany"
                value="1"
                checked={isCompany}
                onChange={(e) => setIsCompany(e.target.checked)}
              />
              Soy empresa
            </label>

            {isCompany ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="companyName">Nombre de la empresa</Label>
                  <Input id="companyName" name="companyName" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="rifNumber">RIF</Label>
                  <Input id="rifNumber" name="rifNumber" placeholder="Ej: J-12345678-9" required />
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-sm font-medium text-foreground">Documentos KYC (obligatorio)</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Formatos: PDF o imagen. MÃ¡x. 15MB por archivo.
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="kycCedula">Foto/PDF de cÃ©dula</Label>
                  <Input id="kycCedula" name="kycCedula" type="file" accept="application/pdf,image/*" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="kycSelfieCedula">Selfie con cÃ©dula</Label>
                  <Input id="kycSelfieCedula" name="kycSelfieCedula" type="file" accept="application/pdf,image/*" required />
                </div>

                {isCompany ? (
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="kycRif">Foto/PDF del RIF (solo empresas)</Label>
                    <Input id="kycRif" name="kycRif" type="file" accept="application/pdf,image/*" required />
                  </div>
                ) : null}
              </div>
            </div>

            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="acceptTerms" value="1" required />
              <span>
                Acepto las{" "}
                <a className="underline" href="/terminos" target="_blank" rel="noreferrer">
                  condiciones
                </a>{" "}
                y entiendo que crear el usuario no garantiza que serÃ© aprobado por Godplaces.
              </span>
            </label>
          </div>
        </div>
      ) : null}

      <Button className="bg-marca-cta text-marca-petroleo hover:bg-[#f2c70d]" type="submit">
        Crear cuenta
      </Button>
    </form>
  );
}
