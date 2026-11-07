import { NextResponse } from "next/server";
import { sendStockAlertDigest } from "@/lib/stock-alert-email";

// Vercel Cron llama a esta ruta una vez al día (ver vercel.json) y manda
// "Authorization: Bearer $CRON_SECRET". Sin el secreto correcto no se ejecuta.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // ?modo=semanal fuerza la lista completa (para pruebas); por defecto los lunes va completa y
  // el resto de los días solo los productos nuevos.
  const forceWeekly = new URL(request.url).searchParams.get("modo") === "semanal";
  const result = await sendStockAlertDigest({ forceWeekly });
  return NextResponse.json(result);
}
