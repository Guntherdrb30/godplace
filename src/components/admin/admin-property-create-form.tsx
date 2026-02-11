"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { PropertyCreateImagePicker } from "@/components/admin/property-create-image-picker";
import { VenezuelaStateCitySelect } from "@/components/venezuela/state-city-select";

const MAX_IMAGES = 6;
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

function toInt(value: FormDataEntryValue | null, fallback: number) {
  const n = Number.parseInt(String(value || ""), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function AdminPropertyCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const form = event.currentTarget;
    const fd = new FormData(form);

    const titulo = String(fd.get("titulo") || "").trim();
    const descripcion = String(fd.get("descripcion") || "").trim();
    const estadoRegion = String(fd.get("estadoRegion") || "").trim();
    const ciudad = String(fd.get("ciudad") || "").trim();
    const direccion = String(fd.get("direccion") || "").trim();
    const urbanizacion = String(fd.get("urbanizacion") || "").trim();
    const calle = String(fd.get("calle") || "").trim();
    const avenida = String(fd.get("avenida") || "").trim();
    const nivelPlanta = String(fd.get("nivelPlanta") || "").trim();

    const pricePerNightCents = toInt(fd.get("pricePerNightCents"), 0);
    const huespedesMax = toInt(fd.get("huespedesMax"), 1);
    const habitaciones = toInt(fd.get("habitaciones"), 1);
    const camas = toInt(fd.get("camas"), 1);
    const banos = toInt(fd.get("banos"), 1);

    const imagenes = fd
      .getAll("imagenes")
      .filter((entry): entry is File => entry instanceof File && entry.size > 0);

    if (!titulo || !descripcion || !estadoRegion || !ciudad) {
      toast("Completa los campos obligatorios.");
      return;
    }
    if (pricePerNightCents <= 0) {
      toast("El precio por noche debe ser mayor a 0.");
      return;
    }
    if (huespedesMax < 1 || habitaciones < 1 || camas < 1 || banos < 1) {
      toast("Capacidad o cantidades invalidas.");
      return;
    }
    if (imagenes.length > MAX_IMAGES) {
      toast(`Maximo ${MAX_IMAGES} imagenes por propiedad.`);
      return;
    }
    for (const img of imagenes) {
      const ct = (img.type || "").toLowerCase();
      if (ct && !ct.startsWith("image/")) {
        toast("Solo se permiten archivos de imagen.");
        return;
      }
      if (img.size > MAX_IMAGE_BYTES) {
        toast("Cada imagen debe pesar maximo 15MB.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const createRes = await fetch("/api/admin/properties/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          titulo,
          descripcion,
          estadoRegion,
          ciudad,
          direccion,
          urbanizacion,
          calle,
          avenida,
          nivelPlanta,
          pricePerNightCents,
          huespedesMax,
          habitaciones,
          camas,
          banos,
        }),
      });
      const createData = await createRes.json().catch(() => ({}));
      if (!createRes.ok || !createData?.propertyId) {
        toast("No se pudo crear la propiedad.", { description: createData?.message || "" });
        return;
      }

      const propertyId = String(createData.propertyId);
      let uploaded = 0;
      let failed = 0;

      for (const file of imagenes) {
        const uploadForm = new FormData();
        uploadForm.set("file", file);
        uploadForm.set("folder", "properties");
        uploadForm.set("entityId", propertyId);

        const up = await fetch("/api/blob/upload", { method: "POST", body: uploadForm });
        const upData = await up.json().catch(() => ({}));
        if (!up.ok) {
          failed += 1;
          continue;
        }

        const cr = await fetch("/api/admin/property_images/create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            propertyId,
            url: upData.url,
            pathname: upData.pathname,
            alt: file.name,
          }),
        });
        const crData = await cr.json().catch(() => ({}));
        if (!cr.ok) {
          failed += 1;
          await fetch("/api/blob/delete", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ urlOrPathname: upData.pathname || upData.url }),
          }).catch(() => {});
          if (crData?.message) {
            console.warn("[property.create][image.create]", crData.message);
          }
          continue;
        }
        uploaded += 1;
      }

      if (failed > 0) {
        toast("Propiedad creada con advertencias.", {
          description: `Imagenes cargadas: ${uploaded}. Fallidas: ${failed}.`,
        });
      } else {
        toast("Propiedad creada correctamente.", {
          description: `Imagenes cargadas: ${uploaded}.`,
        });
      }

      router.push(`/admin/propiedades/${propertyId}`);
      router.refresh();
    } catch (error) {
      toast("No se pudo crear la propiedad.", {
        description: error instanceof Error ? error.message : "",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-6">
      <fieldset disabled={submitting} className="grid gap-6 disabled:cursor-not-allowed disabled:opacity-80">
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="grid gap-4 rounded-2xl border bg-white/70 p-4">
            <h2 className="text-sm font-semibold text-foreground">Informacion principal</h2>
            <div className="grid gap-2">
              <Label htmlFor="titulo">Titulo</Label>
              <Input id="titulo" name="titulo" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="descripcion">Descripcion</Label>
              <Textarea id="descripcion" name="descripcion" rows={7} required />
              <p className="text-xs text-muted-foreground">
                Incluye lo que ofrece, reglas basicas y lo esencial para el huesped.
              </p>
            </div>
            <VenezuelaStateCitySelect stateName="estadoRegion" cityName="ciudad" required defaultState="" defaultCity="" />
          </section>

          <section className="grid gap-4 rounded-2xl border bg-white/70 p-4">
            <h2 className="text-sm font-semibold text-foreground">Capacidad y precios</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="huespedesMax">Huespedes max.</Label>
                <Input id="huespedesMax" name="huespedesMax" type="number" min={1} defaultValue={4} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="pricePerNightCents">Precio por noche (centavos USD)</Label>
                <Input id="pricePerNightCents" name="pricePerNightCents" type="number" min={1} defaultValue={5000} />
                <p className="text-xs text-muted-foreground">Ejemplo: 5000 = $50.00</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="habitaciones">Habitaciones</Label>
                <Input id="habitaciones" name="habitaciones" type="number" min={1} defaultValue={1} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="camas">Camas</Label>
                <Input id="camas" name="camas" type="number" min={1} defaultValue={1} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="banos">Banos</Label>
                <Input id="banos" name="banos" type="number" min={1} defaultValue={1} />
              </div>
            </div>

            <h3 className="pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ubicacion exacta</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="direccion">Direccion (opcional)</Label>
                <Input id="direccion" name="direccion" placeholder="Direccion o referencia" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="urbanizacion">Urbanizacion (opcional)</Label>
                <Input id="urbanizacion" name="urbanizacion" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="calle">Calle (opcional)</Label>
                <Input id="calle" name="calle" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="avenida">Avenida (opcional)</Label>
                <Input id="avenida" name="avenida" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="nivelPlanta">Nivel/Planta (opcional)</Label>
                <Input id="nivelPlanta" name="nivelPlanta" />
              </div>
            </div>
          </section>
        </div>

        <PropertyCreateImagePicker className="rounded-2xl border bg-white/70 p-4" />

        <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Primero se crea la propiedad y luego se suben las imagenes una por una para evitar errores por tamano.
          </p>
          <Button variant="brand" type="submit" disabled={submitting}>
            {submitting ? "Creando..." : "Crear y continuar"}
          </Button>
        </div>
      </fieldset>
    </form>
  );
}
