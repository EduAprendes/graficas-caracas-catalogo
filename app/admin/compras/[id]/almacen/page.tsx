import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessUser } from "@/lib/access";
import { getPurchaseOrder } from "@/lib/orders";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

// Lista de verificación para el almacén: qué productos y cuántas piezas debe traer el contenedor,
// con casillas para marcar lo que llegó. A propósito NO lleva costos ni precios.
export default async function WarehouseChecklistPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const access = await getAccessUser();
  if (access?.role !== "ADMIN") notFound();

  const session = await auth();
  const order = await getPurchaseOrder(orderId);
  if (!order) notFound();

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const cancelled = order.status === "ANULADA";

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header no-print">
        <div>
          <h1>Lista para almacén · orden #{order.id}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/compras" />
        <Link href={`/admin/compras/${order.id}`} className="admin-back-link">
          ← Volver a la orden de compra
        </Link>
        {cancelled ? (
          <p className="login-error">Esta orden de compra está anulada: no debe usarse en almacén.</p>
        ) : null}
        <p className="statement-note">
          Esta hoja no muestra costos ni precios. Al imprimir se ven las casillas para marcar lo que
          llegó y la columna para anotar la cantidad recibida.
        </p>
      </div>

      <section className="order-ticket">
        <header className="order-ticket-head">
          <div>
            <p className="order-ticket-brand">Gráficas Caracas</p>
            <p className="order-ticket-title">Lista de recepción de mercancía — almacén</p>
          </div>
          <div className="order-ticket-meta">
            <p>
              <strong>Orden de compra N°</strong> {order.id}
            </p>
            <p>
              <strong>Estado</strong>{" "}
              <span className={`status-badge status-${order.status.toLowerCase()}`}>
                {order.status}
              </span>
            </p>
            <p>
              <strong>Impresa</strong> {formatDateTime(new Date())}
            </p>
          </div>
        </header>

        <div className="order-ticket-fields">
          <p>
            <strong>Proveedor / contenedor</strong> {order.supplierName}
          </p>
          <p>
            <strong>Fecha de la orden</strong> {formatDateTime(order.createdAt)}
          </p>
        </div>

        {order.notes ? (
          <p className="order-ticket-notes">
            <strong>Notas</strong> {order.notes}
          </p>
        ) : null}

        <div className="admin-table-wrap">
          <table className="order-print-table warehouse-table">
            <thead>
              <tr>
                <th className="warehouse-check">Llegó</th>
                <th>Código</th>
                <th>Producto</th>
                <th className="num">Cant. esperada</th>
                <th className="warehouse-received">Cant. recibida</th>
                <th>Observaciones</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="warehouse-check" data-label="Llegó">
                    <span className="warehouse-box" />
                  </td>
                  <td data-label="Código">
                    <span className="code">{item.productCode}</span>
                  </td>
                  <td data-label="Producto">{item.productDescription}</td>
                  <td className="num" data-label="Cant. esperada">{item.quantity}</td>
                  <td className="warehouse-received" data-label="Cant. recibida"></td>
                  <td data-label="Observaciones"></td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td></td>
                <td colSpan={2}>
                  Total de piezas ({order.items.length} producto{order.items.length === 1 ? "" : "s"})
                </td>
                <td className="num">{totalQuantity}</td>
                <td></td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="delivery-signatures">
          <div>
            <span className="delivery-line" />
            <p>Recibido por (nombre y firma)</p>
          </div>
          <div>
            <span className="delivery-line" />
            <p>Verificado por (nombre y firma)</p>
          </div>
          <div>
            <span className="delivery-line" />
            <p>Fecha y hora de recepción</p>
          </div>
        </div>
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
      </div>
    </div>
  );
}
