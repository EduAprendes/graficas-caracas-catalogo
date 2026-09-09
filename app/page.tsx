import { getCatalog } from "@/lib/catalog";
import CatalogBrowser from "@/components/CatalogBrowser";

export const dynamic = "force-dynamic";

export default async function Home() {
  const categories = await getCatalog();

  return (
    <div className="page">
      <div className="cover">
        <span className="crop tl"></span>
        <span className="crop tr"></span>
        <span className="crop bl"></span>
        <span className="crop br"></span>

        <p className="eyebrow">
          <span className="regdots">
            <span className="c"></span>
            <span className="m"></span>
            <span className="y"></span>
            <span className="k"></span>
          </span>
          Lista de precios · vigente
        </p>

        <h1 className="title">
          Gráficas <em>Caracas</em>, C.A.
        </h1>
        <p className="subtitle">
          Viniles, acrílicos, banners y sustratos de impresión al mayor y al
          detal — retiro en almacén o delivery en la Gran Caracas.
        </p>

        <div className="contact-bar">
          <div className="contact-item">
            <span className="contact-label">Ubicación</span>
            <span className="contact-value">
              Macaracuay, Almacén Principal, Av. Andrés Bello, Galpón
            </span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Delivery</span>
            <span className="contact-value">Gran Caracas, Distrito Capital</span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Teléfono</span>
            <span className="contact-value">
              <a href="tel:+584242884998">0424.288.4998</a>
            </span>
          </div>
          <div className="contact-item">
            <span className="contact-label">Correo</span>
            <span className="contact-value">
              <a href="mailto:carlagonzalez0404@gmail.com">
                carlagonzalez0404@gmail.com
              </a>
            </span>
          </div>
        </div>
      </div>

      <CatalogBrowser categories={categories} />

      <div className="terms">
        <h2>
          <span className="regdots">
            <span className="c"></span>
            <span className="m"></span>
            <span className="y"></span>
            <span className="k"></span>
          </span>
          Condiciones de pago y promociones
        </h2>
        <dl>
          <dt>Pagos en divisas</dt>
          <dd>Promoción de −5% de descuento (no incluye IVA).</dd>
          <dt>Pagos en bolívares</dt>
          <dd>Se solicita la tasa Binance del día.</dd>
          <dt>Descuentos por volumen</dt>
          <dd>Aplicables por compras al mayor / por cantidad.</dd>
          <dt>Garantía comercial</dt>
          <dd>Mejoramos y competimos cualquier presupuesto.</dd>
        </dl>
      </div>

      <footer className="foot">
        Gráficas Caracas, C.A. — Precios sujetos a cambio sin previo aviso
      </footer>
    </div>
  );
}
