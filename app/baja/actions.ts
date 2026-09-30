"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyUnsubscribeToken } from "@/lib/unsubscribe";

export async function unsubscribeAction(formData: FormData) {
  const customerId = Number(formData.get("c"));
  const token = String(formData.get("t") || "");
  if (!Number.isInteger(customerId) || !verifyUnsubscribeToken(customerId, token)) {
    redirect("/baja");
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: { marketingOptOut: true },
  });

  redirect(`/baja?c=${customerId}&t=${token}&listo=1`);
}
