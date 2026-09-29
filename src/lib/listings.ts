import type { ListingOperationType } from "@prisma/client";

export function listingOperationLabel(operationType: ListingOperationType | string) {
  switch (operationType) {
    case "SALE":
      return "Venta";
    case "SHORT_RENT":
      return "Alquiler temporal";
    case "LONG_RENT":
      return "Alquiler residencial";
    case "COMMERCIAL_RENT":
      return "Alquiler comercial";
    default:
      return String(operationType);
  }
}

export function listingPriceSuffix(operationType: ListingOperationType | string) {
  switch (operationType) {
    case "SHORT_RENT":
      return "/ noche";
    case "LONG_RENT":
    case "COMMERCIAL_RENT":
      return "/ mes";
    case "SALE":
    default:
      return "";
  }
}
