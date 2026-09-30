import Link from "next/link";
import { auth } from "@/auth";
import { getProductOptions } from "@/lib/inventory";
import { getCustomerOptions } from "@/lib/customers";
import { getSellerOptions } from "@/lib/sellers";
import { getAccessUser } from "@/lib/access";
import AdminNav from "@/components/admin/AdminNav";
import SalesOrderForm from "@/components/admin/SalesOrderForm";
import { logoutAction } from "@/app/admin/actions";
import { createCustomerForOrderAction, createSalesOrderAction } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewSalesOrderPage() {
  const session = await auth();
  const access = await getAccessUser();
  const isSeller = access?.role === "VENDEDOR";
  const [products, customers, sellers] = await Promise.all([
    getProductOptions(),
    getCustomerOptions(),
    isSeller ? Promise.resolve([]) : getSellerOptions(),
  ]);

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

      <SalesOrderForm
        products={products}
        customers={customers}
        sellers={sellers}
        fixedSeller={
          isSeller && access?.sellerName
            ? { name: access.sellerName, commissionPercent: access.commissionPercent ?? 0 }
            : undefined
        }
        onCreate={createSalesOrderAction}
        onCreateCustomer={createCustomerForOrderAction}
      />
    </div>
  );
}
