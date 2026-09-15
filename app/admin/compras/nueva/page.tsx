import Link from "next/link";
import { auth } from "@/auth";
import { getProductOptions } from "@/lib/inventory";
import AdminNav from "@/components/admin/AdminNav";
import PurchaseOrderForm from "@/components/admin/PurchaseOrderForm";
import { logoutAction } from "@/app/admin/actions";
import { createPurchaseOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewPurchaseOrderPage() {
  const session = await auth();
  const products = await getProductOptions();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Nueva orden de compra</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/compras" />

      <Link href="/admin/compras" className="admin-back-link">
        ← Volver a órdenes de compra
      </Link>

      <PurchaseOrderForm products={products} onCreate={createPurchaseOrderAction} />
    </div>
  );
}
