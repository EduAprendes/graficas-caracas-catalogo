import Link from "next/link";
import { auth } from "@/auth";

const TABS = [
  { href: "/admin", label: "Inventario" },
  { href: "/admin/catalogo", label: "Catálogo" },
  { href: "/admin/pedidos", label: "Órdenes de venta" },
  { href: "/admin/compras", label: "Órdenes de compra" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/cuentas", label: "Cuentas por cobrar" },
  { href: "/admin/vendedores", label: "Vendedores" },
  { href: "/admin/promociones", label: "Promociones" },
] as const;

// Una vendedora solo ve catálogo y órdenes de venta; el administrador ve todo salvo el
// catálogo de solo lectura (ya tiene Inventario, que es la versión editable).
const SELLER_TABS: string[] = ["/admin/catalogo", "/admin/pedidos"];

export default async function AdminNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  const session = await auth();
  const isSeller = session?.user?.role === "VENDEDOR";
  const tabs = TABS.filter((tab) =>
    isSeller ? SELLER_TABS.includes(tab.href) : tab.href !== "/admin/catalogo"
  );

  return (
    <nav className="admin-nav">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={`admin-nav-link${tab.href === current ? " admin-nav-link-active" : ""}`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
