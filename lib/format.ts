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
