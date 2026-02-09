"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function AllyWithdrawDialog(props: {
  disabled?: boolean;
  bankName: string;
  bankAccountMasked: string;
  accountHolderName: string;
  holderId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amountUsd, setAmountUsd] = React.useState("100");
  const [loading, setLoading] = React.useState(false);

  const submit = async () => {
    const raw = amountUsd.trim();
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n)) {
      toast("Monto inválido.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ally/withdrawals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ amountUsd: n }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo crear la solicitud.", { description: data?.message || "" });
        return;
      }
      toast("Solicitud enviada.", { description: "Queda pendiente de revisión por Admin/Root." });
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" disabled={props.disabled}>
          Retirar dinero
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Retiro</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="rounded-2xl border bg-white/80 p-4 text-sm">
            <div className="text-muted-foreground">Cuenta registrada</div>
            <div className="mt-1 font-medium text-foreground">{props.bankName}</div>
            <div className="text-muted-foreground">{props.bankAccountMasked}</div>
            <div className="mt-2 text-muted-foreground">Titular</div>
            <div className="mt-1 font-medium text-foreground">{props.accountHolderName}</div>
            <div className="text-muted-foreground">{props.holderId}</div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">Monto (USD)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
              placeholder="Ej: 150"
            />
            <p className="text-xs text-muted-foreground">
              Mínimo $100. Se depositará a la cuenta registrada.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button type="button" variant="brand" onClick={submit} disabled={loading}>
              {loading ? "Enviando..." : "Solicitar retiro"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

