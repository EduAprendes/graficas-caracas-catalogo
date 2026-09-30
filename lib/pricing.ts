// Total de una línea de orden de venta: precio × cantidad menos el descuento (%).
export function lineTotal(item: {
  unitPrice: unknown;
  quantity: number;
  discountPercent?: unknown;
}): number {
  if (item.unitPrice == null) return 0;
  const discount = Math.min(100, Math.max(0, Number(item.discountPercent ?? 0)));
  const gross = Number(item.unitPrice) * item.quantity;
  return Math.round(gross * (1 - discount / 100) * 100) / 100;
}
