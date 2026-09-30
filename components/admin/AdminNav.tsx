import Link from "next/link";

const TABS = [
  { href: "/admin", label: "Inventario" },
  { href: "/admin/pedidos", label: "Órdenes de venta" },
  { href: "/admin/compras", label: "Órdenes de compra" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/cuentas", label: "Cuentas por cobrar" },
  { href: "/admin/vendedores", label: "Vendedores" },
  { href: "/admin/promociones", label: "Promociones" },
] as const;

export default function AdminNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  return (
    <nav className="admin-nav">
      {TABS.map((tab) => (
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
