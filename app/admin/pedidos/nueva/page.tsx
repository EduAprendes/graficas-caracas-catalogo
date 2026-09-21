import Link from "next/link";
import { auth } from "@/auth";
import { getProductOptions } from "@/lib/inventory";
import { getCustomerOptions } from "@/lib/customers";
import AdminNav from "@/components/admin/AdminNav";
import SalesOrderForm from "@/components/admin/SalesOrderForm";
import { logoutAction } from "@/app/admin/actions";
import { createSalesOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage() {
  const session = await auth();
  const [products, customers] = await Promise.all([getProductOptions(), getCustomerOptions()]);

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Nueva orden de venta</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/pedidos" />

      <Link href="/admin/pedidos" className="admin-back-link">
        ← Volver a órdenes de venta
      </Link>

      <SalesOrderForm products={products} customers={customers} onCreate={createSalesOrderAction} />
    </div>
  );
}
