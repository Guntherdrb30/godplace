"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AdminWithdrawalActions(props: {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");

  const [paidOpen, setPaidOpen] = React.useState(false);
  const [paymentReference, setPaymentReference] = React.useState("");
  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);

  const approve = async () => {
    setLoading("approve");
    try {
      const res = await fetch(`/api/admin/withdrawals/${props.id}/approve`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo aprobar.", { description: data?.message || "" });
        return;
      }
      toast("Solicitud aprobada.");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const reject = async () => {
    const limpio = reason.trim();
    if (limpio.length < 3) {
      toast("Escribe una razón válida.");
      return;
    }
    setLoading("reject");
    try {
      const res = await fetch(`/api/admin/withdrawals/${props.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: limpio }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo rechazar.", { description: data?.message || "" });
        return;
      }
      toast("Solicitud rechazada.");
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  const markPaid = async () => {
    setLoading("paid");
    try {
      const fd = new FormData();
      if (paymentReference.trim()) fd.set("paymentReference", paymentReference.trim());
      if (receiptFile) fd.set("receiptFile", receiptFile);
      const res = await fetch(`/api/admin/withdrawals/${props.id}/mark-paid`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast("No se pudo marcar como pagado.", { description: data?.message || "" });
        return;
      }
      toast("Marcado como pagado.");
      setPaidOpen(false);
      setPaymentReference("");
      setReceiptFile(null);
      router.refresh();
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={approve} disabled={!!loading || props.status !== "PENDING"}>
        {loading === "approve" ? "Aprobando..." : "Aprobar"}
      </Button>

      <Button type="button" variant="outline" size="sm" onClick={() => setRejectOpen(true)} disabled={!!loading || (props.status !== "PENDING" && props.status !== "APPROVED")}>
        Rechazar
      </Button>

      <Button type="button" size="sm" className="bg-brand-accent text-brand-secondary hover:bg-brand-accent/90" onClick={() => setPaidOpen(true)} disabled={!!loading || props.status !== "APPROVED"}>
        Marcar pagado
      </Button>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Rechazar solicitud</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <Label htmlFor="reason">Razón</Label>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Ej: Datos bancarios inconsistentes." />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)} disabled={!!loading}>
                Cancelar
              </Button>
              <Button type="button" variant="destructive" onClick={reject} disabled={loading === "reject"}>
                {loading === "reject" ? "Rechazando..." : "Rechazar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Marcar como pagado</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ref">Referencia bancaria (opcional)</Label>
              <Input id="ref" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Ej: TRX-123456" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="receipt">Comprobante (PDF o imagen, opcional)</Label>
              <Input
                id="receipt"
                type="file"
                accept="application/pdf,image/*"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setPaidOpen(false)} disabled={!!loading}>
                Cancelar
              </Button>
              <Button type="button" onClick={markPaid} disabled={loading === "paid"}>
                {loading === "paid" ? "Guardando..." : "Confirmar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

