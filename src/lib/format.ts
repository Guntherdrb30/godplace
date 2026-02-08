export function formatMoney(cents: number, currency: string) {
  const amount = cents / 100;
  try {
    return new Intl.NumberFormat("es-VE", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

