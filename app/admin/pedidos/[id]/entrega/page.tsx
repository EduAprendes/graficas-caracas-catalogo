import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAccessUser } from "@/lib/access";
import { getSalesOrder } from "@/lib/orders";
import { getCompany, missingCompanyFields } from "@/lib/company";
import { getDeliveryCustomer, getDeliveryFields } from "@/lib/delivery";
import { formatDateTime } from "@/lib/format";
import AdminNav from "@/components/admin/AdminNav";
import PrintButton from "@/components/admin/PrintButton";
import { logoutAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

function Blank({ value, minWidth = "9rem" }: { value?: string | null; minWidth?: string }) {
  return value ? (
    <span>{value}</span>
  ) : (
    <span className="delivery-blank" style={{ minWidth }} />
  );
}

// Orden de entrega imprimible para el transportista. Es un documento INTERNO: solo tiene
// validez fiscal cuando la imprenta digital autorizada le asigna su número de control.
export default async function DeliveryOrderPage({
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
  const order = await getSalesOrder(orderId);
  if (!order) notFound();

  const [fields, customer] = await Promise.all([
    getDeliveryFields(orderId),
    getDeliveryCustomer(order.customerId),
  ]);
  const company = getCompany();
  const missing = missingCompanyFields(company);
  const controlNumber = fields?.deliveryControlNumber ?? null;
  const cancelled = order.status !== "CONFIRMADA";
  const destination = order.deliveryAddress || customer?.address || null;

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header no-print">
        <div>
          <h1>Orden de entrega #{order.id}</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <div className="no-print">
        <AdminNav current="/admin/pedidos" />
        <Link href={`/admin/pedidos/${order.id}`} className="admin-back-link">
          ← Volver a la orden de venta
        </Link>
        {missing.length > 0 ? (
          <p className="login-error">
            Faltan datos del emisor en el servidor: {missing.join(", ")}. Salen en blanco en el
            documento.
          </p>
        ) : null}
        {cancelled ? (
          <p className="login-error">
            Esta orden de venta está anulada: no debe usarse para trasladar mercancía.
          </p>
        ) : null}
        {!fields?.driverName || !fields.vehiclePlate ? (
          <p className="statement-note">
            Faltan datos del chofer o de la placa; cargalos en el detalle de la orden. Si no, salen
            en blanco para completarlos a mano.
          </p>
        ) : null}
      </div>

      <section className="order-ticket delivery-doc">
        <header className="delivery-head">
          <div className="delivery-issuer">
            <p className="delivery-company">{company.name ?? <Blank minWidth="16rem" />}</p>
            <p>
              <strong>RIF:</strong> <Blank value={company.rif} minWidth="8rem" />
            </p>
            <p>
              <strong>Domicilio fiscal:</strong> <Blank value={company.address} minWidth="16rem" />
            </p>
            {company.phone ? (
              <p>
                <strong>Teléfono:</strong> {company.phone}
              </p>
            ) : null}
          </div>
          <div className="delivery-title-box">
            <p className="delivery-title">ORDEN DE ENTREGA</p>
            <p className="delivery-subtitle">Sin derecho a crédito fiscal</p>
            <p>
              <strong>Ref. interna:</strong> OV-{String(order.id).padStart(6, "0")}
            </p>
            <p>
              <strong>Fecha de emisión:</strong> {formatDateTime(new Date())}
            </p>
          </div>
        </header>

        <div className="delivery-control">
          <div>
            <span className="delivery-label">N° de control (asignado por la imprenta digital autorizada)</span>
            <span className="delivery-control-value">
              {controlNumber ?? <span className="delivery-blank" style={{ minWidth: "12rem" }} />}
            </span>
          </div>
          <div>
            <span className="delivery-label">Imprenta digital autorizada (nombre, RIF y providencia)</span>
            <span>
              <Blank value={fields?.deliveryPrinterInfo} minWidth="20rem" />
            </span>
          </div>
        </div>

        <div className="delivery-grid">
          <div className="delivery-box">
            <p className="delivery-box-title">Receptor</p>
            <p>
              <strong>Nombre / razón social:</strong>{" "}
              {customer?.company ? `${customer.company} — ${customer.name}` : (customer?.name ?? order.customerName)}
            </p>
            <p>
              <strong>RIF / C.I.:</strong> <Blank value={customer?.taxId} minWidth="8rem" />
            </p>
            <p>
              <strong>Teléfono:</strong> {customer?.phone ?? "—"}
            </p>
          </div>
          <div className="delivery-box">
            <p className="delivery-box-title">Traslado</p>
            <p>
              <strong>Motivo:</strong> Entrega de mercancía vendida (orden de venta #{order.id})
            </p>
            <p>
              <strong>Origen:</strong> <Blank value={company.address} minWidth="12rem" />
            </p>
            <p>
              <strong>Destino:</strong> <Blank value={destination} minWidth="12rem" />
            </p>
          </div>
          <div className="delivery-box">
            <p className="delivery-box-title">Transporte</p>
            <p>
              <strong>Chofer:</strong> <Blank value={fields?.driverName} />
            </p>
            <p>
              <strong>Cédula:</strong> <Blank value={fields?.driverIdNumber} minWidth="7rem" />
            </p>
            <p>
              <strong>Placa del vehículo:</strong> <Blank value={fields?.vehiclePlate} minWidth="6rem" />
            </p>
          </div>
        </div>

        <div className="admin-table-wrap">
          <table className="order-print-table delivery-table">
            <thead>
              <tr>
                <th className="num">Cant</th>
                <th>Código</th>
                <th>Descripción del bien</th>
                <th className="num">Precio unit.</th>
                <th className="num">Desc.</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="num" data-label="Cant">{item.quantity}</td>
                  <td data-label="Código">{item.productCode}</td>
                  <td data-label="Descripción">{item.description}</td>
                  <td className="num" data-label="Precio unit.">
                    {item.unitPrice != null ? item.unitPrice.toFixed(2) : "—"}
                  </td>
                  <td className="num" data-label="Desc.">
                    {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
                  </td>
                  <td className="num" data-label="Total">
                    {item.unitPrice != null ? item.lineTotal.toFixed(2) : "—"}
                  </td>
                </tr>
              ))}
              <tr className="order-print-total">
                <td className="num">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                <td colSpan={4}>Total de piezas / monto referencial</td>
                <td className="num">{order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="delivery-note">
          Montos referenciales, sin IVA. La factura correspondiente se emitirá posteriormente y hará
          referencia a esta orden de entrega.
        </p>

        <div className="delivery-signatures">
          <div>
            <span className="delivery-line" />
            <p>Despachado por (nombre, C.I. y firma)</p>
          </div>
          <div>
            <span className="delivery-line" />
            <p>Transportista (firma)</p>
          </div>
          <div>
            <span className="delivery-line" />
            <p>Recibido conforme (nombre, C.I., firma, sello, fecha y hora)</p>
          </div>
        </div>

        <p className={controlNumber ? "delivery-warning delivery-warning-soft" : "delivery-warning"}>
          {controlNumber
            ? "N° de control registrado manualmente: verificar que coincide con el documento emitido por la imprenta digital autorizada."
            : "DOCUMENTO INTERNO SIN NÚMERO DE CONTROL: no tiene validez fiscal. Debe emitirse por la imprenta digital autorizada por el SENIAT."}
        </p>
      </section>

      <div className="order-form-actions no-print">
        <PrintButton />
      </div>
    </div>
  );
}
