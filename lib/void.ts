// Anulación de registros de dinero (pagos, abonos, gastos): nada se borra, queda la huella
// (cuándo, quién y por qué). Lo anulado no cuenta en ningún saldo ni total.

export type VoidInfo = { voidedAt: Date; voidedByName: string | null; voidReason: string | null };

export type Voidable = {
  voidedAt: Date | null;
  voidedByName: string | null;
  voidReason: string | null;
};

export function voidInfoOf(row: Voidable): VoidInfo | null {
  return row.voidedAt
    ? { voidedAt: row.voidedAt, voidedByName: row.voidedByName, voidReason: row.voidReason }
    : null;
}

// Motivo obligatorio para anular (la columna admite 191 caracteres).
export function cleanVoidReason(reason: string): string {
  const clean = reason.trim();
  if (clean.length < 3) throw new Error("Escribe el motivo de la anulación");
  if (clean.length > 180) throw new Error("El motivo es demasiado largo (máximo 180 caracteres)");
  return clean;
}

// Suma solo los pagos vigentes (los anulados no cuentan).
export function activePaymentsTotal(
  payments: { amount: unknown; voidedAt?: Date | null }[]
): number {
  return payments.reduce((sum, p) => (p.voidedAt ? sum : sum + Number(p.amount)), 0);
}
