import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";

const icon = (paths: ReactNode) => (
  <svg
    className="admin-nav-icon"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths}
  </svg>
);

const TABS = [
  {
    href: "/admin/resumen",
    label: "Resumen",
    group: "operacion",
    icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  },
  {
    href: "/admin",
    label: "Inventario",
    group: "operacion",
    icon: icon(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>),
  },
  {
    href: "/admin/catalogo",
    label: "Catálogo",
    group: "operacion",
    icon: icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  },
  {
    href: "/admin/pedidos",
    label: "Órdenes de venta",
    group: "operacion",
    icon: icon(<><path d="M6 3h12l2 4v14H4V7l2-4Z" /><path d="M4 7h16M9 11a3 3 0 0 0 6 0" /></>),
  },
  {
    href: "/admin/compras",
    label: "Órdenes de compra",
    group: "operacion",
    icon: icon(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11L21 7H6" /></>),
  },
  {
    href: "/admin/clientes",
    label: "Clientes",
    group: "personas",
    icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></>),
  },
  {
    href: "/admin/cuentas",
    label: "Cuentas por cobrar",
    group: "personas",
    icon: icon(<><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10.5h19M6.5 15h3" /></>),
  },
  {
    href: "/admin/vendedores",
    label: "Vendedores",
    group: "personas",
    icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c.7-4 3.9-6.5 8-6.5s7.3 2.5 8 6.5" /></>),
  },
  {
    href: "/admin/promociones",
    label: "Promociones",
    group: "marketing",
    icon: icon(<><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>),
  },
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
    <nav className="admin-nav" aria-label="Secciones del panel">
      {tabs.map((tab, i) => (
        <span key={tab.href} className="admin-nav-item">
          {i > 0 && tabs[i - 1].group !== tab.group ? (
            <span className="admin-nav-sep" aria-hidden="true" />
          ) : null}
          <Link
            href={tab.href}
            aria-current={tab.href === current ? "page" : undefined}
            className={`admin-nav-link${tab.href === current ? " admin-nav-link-active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        </span>
      ))}
    </nav>
  );
}
