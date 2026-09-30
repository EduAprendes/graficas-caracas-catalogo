"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/access";
import {
  sendCampaign,
  sendCampaignTest,
  type Audience,
  type CampaignContent,
  type CampaignResult,
} from "@/lib/campaigns";

async function requireUserId() {
  const user = await requireAdmin();
  return user.id;
}

export async function sendCampaignTestAction(
  to: string,
  content: CampaignContent
): Promise<{ ok: true } | { error: string }> {
  try {
    await requireUserId();
    await sendCampaignTest(to.trim(), content);
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar la prueba" };
  }
}

export async function sendCampaignAction(
  audience: Audience,
  content: CampaignContent
): Promise<CampaignResult | { error: string }> {
  try {
    const userId = await requireUserId();
    if (audience !== "TODOS" && audience !== "COMPRADORES") {
      return { error: "Audiencia inválida" };
    }
    const result = await sendCampaign(userId, audience, content);
    revalidatePath("/admin/promociones");
    return result;
  } catch (err) {
    return { error: err instanceof Error ? err.message : "No se pudo enviar la promoción" };
  }
}
