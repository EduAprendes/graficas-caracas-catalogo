import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getProductOptions } from "@/lib/inventory";
import { getPurchaseOrder } from "@/lib/orders";
import AdminNav from "@/components/admin/AdminNav";
import PurchaseOrderForm from "@/components/admin/PurchaseOrderForm";
import { logoutAction } from "@/app/admin/actions";
import { updatePurchaseOrderAction } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const session = await auth();
  const order = await getPurchaseOrder(orderId);
  if (!order) notFound();
  if (order.status === "ANULADA") redirect(`/admin/compras/${orderId}`);

  const products = await getProductOptions();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Editar orden de compra #{order.id}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/compras" />

      <Link href={`/admin/compras/${order.id}`} className="admin-back-link">
        ← Volver a la orden
      </Link>

      {order.status === "RECIBIDA" ? (
        <p className="admin-notice">
          Esta orden ya fue recibida: si cambiás cantidades, el stock de cada producto se
          ajustará automáticamente por la diferencia.
        </p>
      ) : null}

      <PurchaseOrderForm
        products={products}
        onCreate={updatePurchaseOrderAction.bind(null, order.id)}
        submitLabel="Guardar cambios"
        pendingLabel="Guardando…"
        initialData={{
          supplierName: order.supplierName,
          notes: order.notes ?? "",
          items: order.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            cost: item.cost,
            suggestedPrice: item.suggestedPrice,
          })),
        }}
      />
    </div>
  );
}
