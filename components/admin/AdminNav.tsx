import type { ReactNode } from "react";
import Link from "next/link";
import { auth } from "@/auth";
import { getStockAlerts } from "@/lib/stock-alerts";

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
    href: "/admin",
    tone: "resumen",
    label: "Resumen",
    group: "operacion",
    icon: icon(<path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />),
  },
  {
    href: "/admin/inventario",
    tone: "inventario",
    label: "Inventario",
    group: "operacion",
    icon: icon(<><path d="M21 8 12 3 3 8v8l9 5 9-5V8Z" /><path d="m3 8 9 5 9-5M12 13v8" /></>),
  },
  {
    href: "/admin/catalogo",
    tone: "catalogo",
    label: "Catálogo",
    group: "operacion",
    icon: icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  },
  {
    href: "/admin/pedidos",
    tone: "ventas",
    label: "Órdenes de venta",
    group: "operacion",
    icon: icon(<><path d="M6 3h12l2 4v14H4V7l2-4Z" /><path d="M4 7h16M9 11a3 3 0 0 0 6 0" /></>),
  },
  {
    href: "/admin/mis-ventas",
    tone: "ganancias",
    label: "Mis comisiones",
    group: "operacion",
    icon: icon(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  },
  {
    href: "/admin/compras",
    tone: "compras",
    label: "Órdenes de compra",
    group: "operacion",
    icon: icon(<><circle cx="9" cy="20" r="1.5" /><circle cx="18" cy="20" r="1.5" /><path d="M2 3h3l2.5 12h11L21 7H6" /></>),
  },
  {
    href: "/admin/clientes",
    tone: "clientes",
    label: "Clientes",
    group: "personas",
    icon: icon(<><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.4 3.2-5.5 6.5-5.5s5.9 2.1 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.9.7 3.1 2.4 3.5 5.2" /></>),
  },
  {
    href: "/admin/cuentas",
    tone: "cuentas",
    label: "Cuentas por cobrar",
    group: "personas",
    icon: icon(<><rect x="2.5" y="6" width="19" height="13" rx="2" /><path d="M2.5 10.5h19M6.5 15h3" /></>),
  },
  {
    href: "/admin/vendedores",
    tone: "vendedores",
    label: "Vendedores",
    group: "personas",
    icon: icon(<><circle cx="12" cy="8" r="4" /><path d="M4 21c.7-4 3.9-6.5 8-6.5s7.3 2.5 8 6.5" /></>),
  },
  {
    href: "/admin/ganancias",
    tone: "ganancias",
    label: "Balance",
    group: "finanzas",
    icon: icon(<><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>),
  },
  {
    href: "/admin/salud",
    tone: "ganancias",
    label: "Salud",
    group: "finanzas",
    icon: icon(<path d="M3 12h4l2-6 4 12 2-6h6" />),
  },
  {
    href: "/admin/promociones",
    tone: "promociones",
    label: "Promociones",
    group: "marketing",
    icon: icon(<><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" /></>),
  },
] as const;

// Una vendedora solo ve catálogo y órdenes de venta; el administrador ve todo salvo el
// catálogo de solo lectura (ya tiene Inventario, que es la versión editable).
const SELLER_TABS: string[] = ["/admin/catalogo", "/admin/pedidos", "/admin/mis-ventas"];
// La administradora no ve compras, salud ni balance.
const ADMINISTRADORA_HIDDEN: string[] = ["/admin/compras", "/admin/salud", "/admin/ganancias"];

export default async function AdminNav({ current }: { current: (typeof TABS)[number]["href"] }) {
  const session = await auth();
  const isSeller = session?.user?.role === "VENDEDOR";
  const isAdministradora = session?.user?.role === "ADMINISTRADORA";
  const tabs = TABS.filter((tab) =>
    isSeller
      ? SELLER_TABS.includes(tab.href)
      : tab.href !== "/admin/catalogo" &&
        tab.href !== "/admin/mis-ventas" &&
        !(isAdministradora && ADMINISTRADORA_HIDDEN.includes(tab.href))
  );

  // Campana de stock bajo (solo administrador). Si el cálculo falla, el menú se ve igual.
  let lowStockCount = 0;
  if (!isSeller) {
    try {
      lowStockCount = (await getStockAlerts()).alerts.length;
    } catch (err) {
      console.error("No se pudo calcular el stock bajo para el menú:", err);
    }
  }

  return (
    <nav className="admin-nav" aria-label="Secciones del panel">
      {tabs.map((tab, i) => (
        <span key={tab.href} className="admin-nav-item">
          {i > 0 && tabs[i - 1].group !== tab.group ? (
            <span className="admin-nav-sep" aria-hidden="true" />
          ) : null}
          <Link
            href={tab.href}
            data-tone={tab.tone}
            aria-current={tab.href === current ? "page" : undefined}
            className={`admin-nav-link${tab.href === current ? " admin-nav-link-active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        </span>
      ))}
      {!isSeller ? (
        <Link
          href="/admin/inventario/stock-bajo"
          className={`admin-nav-bell${lowStockCount > 0 ? " has-alerts" : ""}`}
          aria-label={
            lowStockCount > 0
              ? `Stock bajo: ${lowStockCount} ${lowStockCount === 1 ? "producto" : "productos"} en alerta`
              : "Stock bajo: sin alertas"
          }
          title={lowStockCount > 0 ? `${lowStockCount} en stock bajo` : "Sin alertas de stock"}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9Z" />
            <path d="M10 20a2 2 0 0 0 4 0" />
          </svg>
          {lowStockCount > 0 ? (
            <span className="admin-nav-bell-count">{lowStockCount > 99 ? "99+" : lowStockCount}</span>
          ) : null}
        </Link>
      ) : null}
    </nav>
  );
}
