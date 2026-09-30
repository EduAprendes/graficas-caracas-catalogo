import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Lo único del admin que puede ver una vendedora: catálogo y órdenes de venta.
// (Además, cada acción del servidor valida el rol; esto es la primera barrera.)
const SELLER_ALLOWED = ["/admin/pedidos", "/admin/catalogo"];

export default auth((req) => {
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Sesiones anteriores a los roles no traen "role": eran administradores.
  const role = req.auth.user?.role ?? "ADMIN";
  if (role === "VENDEDOR") {
    const path = req.nextUrl.pathname;
    const allowed = SELLER_ALLOWED.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
    if (!allowed) {
      return NextResponse.redirect(new URL("/admin/pedidos", req.url));
    }
  }
});

export const config = {
  matcher: ["/admin/:path*"],
};
