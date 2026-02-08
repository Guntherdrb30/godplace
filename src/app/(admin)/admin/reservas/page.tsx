import { Container } from "@/components/site/container";
import { prisma } from "@/lib/prisma";
import { buildMetadata } from "@/lib/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/guards";
import { revalidatePath } from "next/cache";
import { registrarAuditoria } from "@/lib/audit";
import { formatMoney } from "@/lib/format";
import type { BookingStatus } from "@prisma/client";
import { labelBookingStatus } from "@/lib/labels";

export const dynamic = "force-dynamic";

export const metadata = buildMetadata({ title: "Reservas", path: "/admin/reservas" });

async function actualizarEstado(formData: FormData) {
  "use server";
  const actor = await requireRole(["ADMIN", "ROOT"]);
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id) throw new Error("Falta id.");
  if (!["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED"].includes(status)) {
    throw new Error("Estado inválido.");
  }

  await prisma.booking.update({ where: { id }, data: { status: status as BookingStatus } });
  await registrarAuditoria({
    actorUserId: actor.id,
    accion: "booking.update_status",
    entidadTipo: "booking",
    entidadId: id,
    metadata: { status },
  });
  revalidatePath("/admin/reservas");
}

export default async function AdminReservasPage() {
  const bookings = await prisma.booking.findMany({
    include: { property: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <Container>
      <h1 className="font-[var(--font-display)] text-3xl tracking-tight">Reservas</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Listado y cambio de estados. Pricing snapshot guardado en Booking.
      </p>

      <Card className="mt-8 rounded-3xl bg-white/85 shadow-suave">
        <CardHeader>
          <CardTitle>Listado</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Propiedad</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fechas</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id.slice(0, 10)}…</TableCell>
                  <TableCell className="font-medium">{b.property.titulo}</TableCell>
                  <TableCell>{b.user.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {b.checkIn.toISOString().slice(0, 10)} → {b.checkOut.toISOString().slice(0, 10)}
                  </TableCell>
                  <TableCell>{formatMoney(b.totalCents, b.currency)}</TableCell>
                  <TableCell>{labelBookingStatus(b.status)}</TableCell>
                  <TableCell className="text-right">
                    <form action={actualizarEstado} className="flex justify-end gap-2">
                      <input type="hidden" name="id" value={b.id} />
                      <select
                        name="status"
                        defaultValue={b.status}
                        className="h-9 rounded-md border bg-white px-3 text-sm"
                        aria-label="Estado de reserva"
                      >
                        {["DRAFT", "CONFIRMED", "CANCELLED", "COMPLETED"].map((s) => (
                          <option key={s} value={s}>
                            {labelBookingStatus(s as BookingStatus)}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline">
                        Guardar
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
