export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-VE", {
    dateStyle: "short",
  }).format(date);
}

// Año y mes (1-12) de una fecha en hora de Caracas (el servidor puede estar en UTC).
export function caracasYearMonth(date: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
}

// Inicio de un mes (o de un año entero si month es null) en hora de Caracas (UTC-4, sin horario de verano).
export function caracasRange(year: number, month: number | null): { from: Date; to: Date } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const from = new Date(`${year}-${pad(month ?? 1)}-01T00:00:00-04:00`);
  const nextYear = month == null || month === 12 ? year + 1 : year;
  const nextMonth = month == null || month === 12 ? 1 : month + 1;
  const next = new Date(`${nextYear}-${pad(nextMonth)}-01T00:00:00-04:00`);
  return { from, to: new Date(next.getTime() - 1) };
}
