import { NextResponse } from "next/server";
import { sendStockAlertDigest } from "@/lib/stock-alert-email";

// Vercel Cron llama a esta ruta una vez al día (ver vercel.json) y manda
// "Authorization: Bearer $CRON_SECRET". Sin el secreto correcto no se ejecuta.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const result = await sendStockAlertDigest();
  return NextResponse.json(result);
}
