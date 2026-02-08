import type {
  AllyStatus,
  BookingStatus,
  KycStatus,
  PropertyStatus,
  UserStatus,
} from "@prisma/client";

export function labelUserStatus(s: UserStatus) {
  return s === "ACTIVE" ? "Activa" : "Suspendida";
}

export function labelPropertyStatus(s: PropertyStatus) {
  switch (s) {
    case "DRAFT":
      return "Borrador";
    case "PENDING_APPROVAL":
      return "En revisión";
    case "PUBLISHED":
      return "Publicada";
    case "REJECTED":
      return "Rechazada";
  }
}

export function labelKycStatus(s: KycStatus) {
  switch (s) {
    case "PENDING":
      return "Pendiente";
    case "APPROVED":
      return "Aprobado";
    case "REJECTED":
      return "Rechazado";
  }
}

export function labelAllyStatus(s: AllyStatus) {
  switch (s) {
    case "PENDING_KYC":
      return "KYC pendiente";
    case "KYC_APPROVED":
      return "KYC aprobado";
    case "KYC_REJECTED":
      return "KYC rechazado";
    case "SUSPENDED":
      return "Suspendido";
  }
}

export function labelBookingStatus(s: BookingStatus) {
  switch (s) {
    case "DRAFT":
      return "Borrador";
    case "CONFIRMED":
      return "Confirmada";
    case "CANCELLED":
      return "Cancelada";
    case "COMPLETED":
      return "Completada";
  }
}

