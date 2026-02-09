"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/format";
import { toast } from "sonner";

type Quote = {
  ok: boolean;
  nights?: number;
  totalCents?: number;
  currency?: string;
  platformFeeCents?: number;
  allyEarningsCents?: number;
  message?: string;
};

export function BookingWidget(props: {
  propertyId: string;
  maxGuests: number;
  currency: string;
  pricePerNightCents: number;
}) {
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [guests, setGuests] = React.useState(1);
  const [quote, setQuote] = React.useState<Quote | null>(null);
  const [loading, setLoading] = React.useState(false);

  const cotizar = React.useCallback(async () => {
    if (!checkIn || !checkOut) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tools/quote_booking", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: props.propertyId,
          checkIn,
          checkOut,
          guests,
        }),
      });
      const data = (await res.json().catch(() => null)) as Quote | null;
      setQuote(data);
    } finally {
      setLoading(false);
    }
  }, [checkIn, checkOut, guests, props.propertyId]);

  React.useEffect(() => {
    void cotizar();
  }, [cotizar]);

  const reservar = async () => {
    if (!checkIn || !checkOut) {
      toast("Selecciona fechas de check-in y check-out.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/tools/create_booking_draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          propertyId: props.propertyId,
          checkIn,
          checkOut,
          guests,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo crear la reserva.", {
          description: data?.message || "Intenta nuevamente o inicia sesión.",
        });
        return;
      }
      toast("Reserva creada como borrador.", {
        description: "MVP: pagos reales pendientes. Puedes verla en el panel de administración si aplica.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-3xl border bg-white/85 p-6 shadow-suave">
      <div className="text-sm text-muted-foreground">Desde</div>
      <div className="mt-1 font-[var(--font-display)] text-3xl tracking-tight text-foreground">
        {formatMoney(props.pricePerNightCents, props.currency)}{" "}
        <span className="text-sm font-normal text-muted-foreground">/ noche</span>
      </div>

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="checkin">Check-in</Label>
          <Input id="checkin" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="checkout">Check-out</Label>
          <Input id="checkout" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="guests">Huéspedes</Label>
          <Input
            id="guests"
            type="number"
            min={1}
            max={props.maxGuests}
            value={guests}
            onChange={(e) => setGuests(Math.max(1, Number.parseInt(e.target.value || "1", 10) || 1))}
          />
          <div className="text-xs text-muted-foreground">Máximo: {props.maxGuests}</div>
        </div>

        <div className="rounded-2xl border bg-secondary/40 p-4 text-sm">
          {!quote?.ok ? (
            <div className="text-muted-foreground">
              {loading ? "Cotizando..." : "Selecciona fechas para ver el total."}
            </div>
          ) : (
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span>Noches</span>
                <span className="font-medium text-foreground">{quote.nights}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="font-medium text-foreground">
                  {formatMoney(quote.totalCents || 0, quote.currency || props.currency)}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                Snapshot incluye fee plataforma y ganancias aliado.
              </div>
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="brand"
          onClick={reservar}
          disabled={loading}
        >
          Reservar
        </Button>
        <Button type="button" variant="outline" onClick={cotizar} disabled={loading}>
          Recalcular
        </Button>
      </div>
    </div>
  );
}
