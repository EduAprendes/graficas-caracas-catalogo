import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type Role = "ADMIN" | "VENDEDOR";

export type AccessUser = {
  id: number;
  name: string;
  role: Role;
  // Solo para VENDEDOR: la vendedora (con su % de comisión) a la que está ligado el usuario.
  sellerId: number | null;
  sellerName: string | null;
  commissionPercent: number | null;
};

// Lee el usuario de la base en cada llamada (no del token): así un cambio de rol o la
// baja de una vendedora se aplica de inmediato aunque tenga la sesión abierta.
export async function getAccessUser(): Promise<AccessUser | null> {
  const session = await auth();
  const id = Number(session?.user?.id);
  if (!Number.isInteger(id)) return null;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { seller: true },
  });
  if (!user) return null;

  if (user.role === "VENDEDOR") {
    // Una vendedora cancelada (o sin vendedora ligada) ya no puede operar.
    if (!user.seller || user.seller.cancelledAt) return null;
    return {
      id: user.id,
      name: user.name,
      role: "VENDEDOR",
      sellerId: user.seller.id,
      sellerName: user.seller.name,
      commissionPercent: Number(user.seller.commissionPercent),
    };
  }

  return {
    id: user.id,
    name: user.name,
    role: "ADMIN",
    sellerId: null,
    sellerName: null,
    commissionPercent: null,
  };
}

export async function requireUser(): Promise<AccessUser> {
  const user = await getAccessUser();
  if (!user) throw new Error("No autorizado");
  return user;
}

export async function requireAdmin(): Promise<AccessUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("No autorizado");
  return user;
}
