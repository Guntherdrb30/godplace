import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

class ControlledRollback extends Error {
  constructor() {
    super("METRORA_TEST_ROLLBACK");
    this.name = "ControlledRollback";
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`[METRORA][ISOLATION][FAIL] ${message}`);
  }
}

async function main() {
  const runId = randomUUID().replace(/-/g, "").slice(0, 16);
  let assertionsCompleted = false;

  try {
    await prisma.$transaction(
      async (tx) => {
        const tenantA = await tx.tenant.create({
          data: {
            slug: `qa-a-${runId}`,
            name: `QA Inmobiliaria A ${runId}`,
            status: "ACTIVE",
            isDefault: false,
          },
        });

        const tenantB = await tx.tenant.create({
          data: {
            slug: `qa-b-${runId}`,
            name: `QA Inmobiliaria B ${runId}`,
            status: "ACTIVE",
            isDefault: false,
          },
        });

        const adminA = await tx.user.create({
          data: {
            email: `qa-admin-a-${runId}@example.test`,
            nombre: "QA Admin A",
            passwordHash: "qa-not-a-real-password-hash",
          },
        });

        const adminB = await tx.user.create({
          data: {
            email: `qa-admin-b-${runId}@example.test`,
            nombre: "QA Admin B",
            passwordHash: "qa-not-a-real-password-hash",
          },
        });

        const buyer = await tx.user.create({
          data: {
            email: `qa-buyer-${runId}@example.test`,
            nombre: "QA Buyer",
            passwordHash: "qa-not-a-real-password-hash",
          },
        });

        await tx.tenantMembership.createMany({
          data: [
            { tenantId: tenantA.id, userId: adminA.id, role: "ADMIN", isActive: true },
            { tenantId: tenantB.id, userId: adminB.id, role: "ADMIN", isActive: true },
            { tenantId: tenantA.id, userId: buyer.id, role: "MEMBER", isActive: true },
          ],
        });

        const allyA = await tx.allyProfile.create({
          data: {
            tenantId: tenantA.id,
            userId: adminA.id,
            status: "KYC_APPROVED",
            isInternal: false,
          },
        });

        const allyB = await tx.allyProfile.create({
          data: {
            tenantId: tenantB.id,
            userId: adminB.id,
            status: "KYC_APPROVED",
            isInternal: false,
          },
        });

        const propertyA = await tx.property.create({
          data: {
            tenantId: tenantA.id,
            allyProfileId: allyA.id,
            status: "PUBLISHED",
            titulo: "QA Propiedad A",
            descripcion: "Propiedad aislada del tenant A",
            ciudad: "Barinas",
            estadoRegion: "Barinas",
            huespedesMax: 4,
            pricePerNightCents: 10000,
          },
        });

        const propertyB = await tx.property.create({
          data: {
            tenantId: tenantB.id,
            allyProfileId: allyB.id,
            status: "PUBLISHED",
            titulo: "QA Propiedad B",
            descripcion: "Propiedad aislada del tenant B",
            ciudad: "Caracas",
            estadoRegion: "Distrito Capital",
            huespedesMax: 2,
            pricePerNightCents: 15000,
          },
        });

        const checkIn = new Date("2030-01-10T00:00:00.000Z");
        const checkOut = new Date("2030-01-12T00:00:00.000Z");

        const bookingA = await tx.booking.create({
          data: {
            tenantId: tenantA.id,
            propertyId: propertyA.id,
            userId: buyer.id,
            checkIn,
            checkOut,
            guests: 2,
            nights: 2,
            currency: "USD",
            pricePerNightCents: 10000,
            subtotalCents: 20000,
            platformFeeCents: 2000,
            allyEarningsCents: 18000,
            totalCents: 22000,
            snapshot: { qa: true, tenant: "A" },
          },
        });

        const bookingB = await tx.booking.create({
          data: {
            tenantId: tenantB.id,
            propertyId: propertyB.id,
            userId: buyer.id,
            checkIn,
            checkOut,
            guests: 1,
            nights: 2,
            currency: "USD",
            pricePerNightCents: 15000,
            subtotalCents: 30000,
            platformFeeCents: 3000,
            allyEarningsCents: 27000,
            totalCents: 33000,
            snapshot: { qa: true, tenant: "B" },
          },
        });

        await tx.auditLog.createMany({
          data: [
            {
              tenantId: tenantA.id,
              actorUserId: adminA.id,
              accion: "qa.tenant_a",
              entidadTipo: "property",
              entidadId: propertyA.id,
            },
            {
              tenantId: tenantB.id,
              actorUserId: adminB.id,
              accion: "qa.tenant_b",
              entidadTipo: "property",
              entidadId: propertyB.id,
            },
          ],
        });

        const propertiesA = await tx.property.findMany({ where: { tenantId: tenantA.id } });
        const propertiesB = await tx.property.findMany({ where: { tenantId: tenantB.id } });
        assert(propertiesA.length === 1 && propertiesA[0].id === propertyA.id, "Tenant A no ve exactamente su propiedad.");
        assert(propertiesB.length === 1 && propertiesB[0].id === propertyB.id, "Tenant B no ve exactamente su propiedad.");

        const crossPropertyAtoB = await tx.property.findFirst({
          where: { id: propertyB.id, tenantId: tenantA.id },
        });
        const crossPropertyBtoA = await tx.property.findFirst({
          where: { id: propertyA.id, tenantId: tenantB.id },
        });
        assert(crossPropertyAtoB === null, "Tenant A pudo leer una propiedad del Tenant B.");
        assert(crossPropertyBtoA === null, "Tenant B pudo leer una propiedad del Tenant A.");

        const bookingsA = await tx.booking.findMany({ where: { tenantId: tenantA.id } });
        const bookingsB = await tx.booking.findMany({ where: { tenantId: tenantB.id } });
        assert(bookingsA.length === 1 && bookingsA[0].id === bookingA.id, "Tenant A no ve exactamente su reserva.");
        assert(bookingsB.length === 1 && bookingsB[0].id === bookingB.id, "Tenant B no ve exactamente su reserva.");

        const crossBooking = await tx.booking.findFirst({
          where: { id: bookingB.id, tenantId: tenantA.id },
        });
        assert(crossBooking === null, "Tenant A pudo leer una reserva del Tenant B.");

        const crossAlly = await tx.allyProfile.findFirst({
          where: { id: allyB.id, tenantId: tenantA.id },
        });
        assert(crossAlly === null, "Tenant A pudo leer el perfil aliado del Tenant B.");

        const membersA = await tx.tenantMembership.findMany({
          where: { tenantId: tenantA.id, isActive: true },
        });
        const membersB = await tx.tenantMembership.findMany({
          where: { tenantId: tenantB.id, isActive: true },
        });
        assert(membersA.some((m) => m.userId === adminA.id), "Admin A no pertenece al Tenant A.");
        assert(!membersA.some((m) => m.userId === adminB.id), "Admin B apareció dentro del Tenant A.");
        assert(membersB.some((m) => m.userId === adminB.id), "Admin B no pertenece al Tenant B.");
        assert(!membersB.some((m) => m.userId === adminA.id), "Admin A apareció dentro del Tenant B.");

        const crossUpdate = await tx.property.updateMany({
          where: { id: propertyB.id, tenantId: tenantA.id },
          data: { titulo: "SHOULD NOT UPDATE" },
        });
        assert(crossUpdate.count === 0, "Un update tenant-scoped de A modificó una propiedad de B.");

        const logsA = await tx.auditLog.findMany({ where: { tenantId: tenantA.id } });
        const logsB = await tx.auditLog.findMany({ where: { tenantId: tenantB.id } });
        assert(logsA.length === 1 && logsA[0].accion === "qa.tenant_a", "Auditoría A mezcló datos.");
        assert(logsB.length === 1 && logsB[0].accion === "qa.tenant_b", "Auditoría B mezcló datos.");

        const federatedMarketplace = await tx.property.findMany({
          where: {
            id: { in: [propertyA.id, propertyB.id] },
            status: "PUBLISHED",
          },
          orderBy: { titulo: "asc" },
        });
        assert(federatedMarketplace.length === 2, "El catálogo federado no puede ver publicaciones de ambos tenants.");

        assertionsCompleted = true;

        console.log("[METRORA][ISOLATION] PASS");
        console.log("[METRORA][ISOLATION] Tenant A/B properties isolated");
        console.log("[METRORA][ISOLATION] Tenant A/B bookings isolated");
        console.log("[METRORA][ISOLATION] Tenant memberships isolated");
        console.log("[METRORA][ISOLATION] Cross-tenant update blocked by scoped query");
        console.log("[METRORA][ISOLATION] Audit logs isolated");
        console.log("[METRORA][ISOLATION] Federated public catalog preserved");
        console.log("[METRORA][ISOLATION] Rolling back all QA data");

        throw new ControlledRollback();
      },
      {
        maxWait: 5000,
        timeout: 20000,
      },
    );
  } catch (error) {
    if (error instanceof ControlledRollback && assertionsCompleted) {
      return;
    }
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
