"use client";

import React from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";

type ListingOption = {
  id: string;
  title: string;
  operationType: string;
  priceCents: number;
  currency: string;
};

const operationLabels: Record<string, string> = {
  SALE: "Venta",
  SHORT_RENT: "Alquiler temporal",
  LONG_RENT: "Alquiler residencial",
  COMMERCIAL_RENT: "Alquiler comercial",
};

export function MarketplaceLeadForm(props: {
  propertyId: string;
  agencyName: string;
  agencyLogoUrl?: string | null;
  agencyPhone?: string | null;
  agencyWhatsapp?: string | null;
  agencyWebsiteUrl?: string | null;
  listings: ListingOption[];
  initialListingId?: string | null;
}) {
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [listingId, setListingId] = React.useState(
    props.initialListingId && props.listings.some((listing) => listing.id === props.initialListingId)
      ? props.initialListingId
      : props.listings[0]?.id || "",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const email = String(data.get("email") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    if (!email && !phone) {
      toast("Indica un correo o telefono para poder contactarte.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/marketplace/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: props.propertyId,
          listingId: listingId || null,
          name: String(data.get("name") || ""),
          email,
          phone,
          message: String(data.get("message") || ""),
          companyWebsite: String(data.get("companyWebsite") || ""),
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo enviar la consulta.", {
          description: result?.message || "Revisa los datos e intenta nuevamente.",
        });
        return;
      }
      setSent(true);
      form.reset();
      toast("Consulta enviada.", {
        description: `${props.agencyName} recibio tu solicitud en su CRM.`,
      });
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-3xl border bg-white/85 p-6 shadow-suave">
        <div className="text-lg font-semibold">Consulta recibida</div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Tu solicitud fue enviada a {props.agencyName}. Un agente podra continuar el seguimiento desde METRORA.
        </p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => setSent(false)}>
          Enviar otra consulta
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border bg-white/85 p-6 shadow-suave">
      <div className="text-sm text-muted-foreground">Representada por</div>
      <div className="mt-2 flex items-center gap-3">
        {props.agencyLogoUrl ? (
          <Image
            src={props.agencyLogoUrl}
            alt={`Logo de ${props.agencyName}`}
            width={42}
            height={42}
            className="rounded-xl border bg-white object-contain p-1"
            unoptimized
          />
        ) : null}
        <div>
          <div className="text-lg font-semibold text-foreground">{props.agencyName}</div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {props.agencyPhone ? <span>{props.agencyPhone}</span> : null}
            {props.agencyWhatsapp ? <span>WhatsApp: {props.agencyWhatsapp}</span> : null}
          </div>
        </div>
      </div>
      {props.agencyWebsiteUrl ? (
        <a
          href={props.agencyWebsiteUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-xs font-medium text-brand-primary hover:underline"
        >
          Sitio web de la inmobiliaria
        </a>
      ) : null}

      <form onSubmit={submit} className="mt-5 grid gap-4">
        {props.listings.length > 0 ? (
          <div className="grid gap-2">
            <Label htmlFor="listingId">Me interesa</Label>
            <select
              id="listingId"
              value={listingId}
              onChange={(e) => setListingId(e.target.value)}
              className="h-10 rounded-md border bg-white px-3 text-sm"
            >
              {props.listings.map((listing) => (
                <option key={listing.id} value={listing.id}>
                  {operationLabels[listing.operationType] || listing.operationType} · {formatMoney(listing.priceCents, listing.currency)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="grid gap-2">
          <Label htmlFor="lead-name">Nombre</Label>
          <Input id="lead-name" name="name" maxLength={120} required />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="lead-email">Email</Label>
            <Input id="lead-email" name="email" type="email" maxLength={160} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lead-phone">Telefono</Label>
            <Input id="lead-phone" name="phone" maxLength={40} />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="lead-message">Mensaje</Label>
          <Textarea
            id="lead-message"
            name="message"
            maxLength={1500}
            rows={4}
            placeholder="Quiero mas informacion, coordinar una visita o conocer las condiciones."
          />
        </div>

        <div className="hidden" aria-hidden="true">
          <Label htmlFor="companyWebsite">Sitio web</Label>
          <Input id="companyWebsite" name="companyWebsite" tabIndex={-1} autoComplete="off" />
        </div>

        <Button type="submit" variant="brand" disabled={loading}>
          {loading ? "Enviando..." : "Solicitar informacion"}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">
          La consulta entra directamente al CRM de la inmobiliaria que representa esta propiedad.
        </p>
      </form>
    </div>
  );
}
