import { auth } from "@/auth";
import { getCustomers } from "@/lib/customers";
import { createCustomer, deleteCustomer, updateCustomer } from "./actions";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import NewCustomerForm from "@/components/admin/NewCustomerForm";
import CustomerRow from "@/components/admin/CustomerRow";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const session = await auth();
  const customers = await getCustomers();

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1>Clientes</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/clientes" />

      <NewCustomerForm onCreate={createCustomer} />

      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Teléfono</th>
              <th className="num">Órdenes</th>
              <th className="num">Total vendido</th>
              <th className="num">Saldo por cobrar</th>
              <th className="num">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="ledger-empty">
                  Todavía no hay clientes. Creá el primero con &quot;+ Nuevo cliente&quot;.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <CustomerRow
                  key={customer.id}
                  customer={customer}
                  onUpdate={updateCustomer.bind(null, customer.id)}
                  onDelete={deleteCustomer.bind(null, customer.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
