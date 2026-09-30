import { auth } from "@/auth";
import {
  AUDIENCE_LABELS,
  MAX_RECIPIENTS,
  countAudiences,
  getCampaigns,
  getDailyLimit,
  getSentToday,
  type Audience,
} from "@/lib/campaigns";
import { isMailConfigured } from "@/lib/mailer";
import { formatDateTime } from "@/lib/format";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import CampaignForm from "@/components/admin/CampaignForm";
import { sendCampaignAction, sendCampaignTestAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function PromotionsPage() {
  const session = await auth();
  const [counts, campaigns, sentToday] = await Promise.all([
    countAudiences(),
    getCampaigns(),
    getSentToday(),
  ]);
  const dailyLimit = getDailyLimit();

  return (
    <div className="admin-page admin-page-wide">
      <div className="admin-header">
        <div>
          <h1>Promociones</h1>
          <p className="admin-user">Sesión: {session?.user?.name ?? session?.user?.username}</p>
        </div>
        <form action={logoutAction}>
          <button type="submit" className="logout-btn">
            Salir
          </button>
        </form>
      </div>

      <AdminNav current="/admin/promociones" />

      {!isMailConfigured() ? (
        <p className="login-error">
          El envío de correos no está configurado en el servidor (variables SMTP).
        </p>
      ) : null}

      <p className="statement-note">
        Envía un correo de promoción o descuento a tus clientes. Solo recibe quien tiene correo
        registrado, no está cancelado y no se dio de baja de las promociones. Máximo{" "}
        {MAX_RECIPIENTS} clientes por envío y {dailyLimit} por día (hoy van {sentToday}). Mandá
        primero una prueba a tu correo.
      </p>

      <CampaignForm
        counts={counts}
        maxRecipients={MAX_RECIPIENTS}
        onSend={sendCampaignAction}
        onTest={sendCampaignTestAction}
      />

      <h2 className="statement-heading">Envíos anteriores</h2>
      <div className="admin-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Asunto</th>
              <th>Audiencia</th>
              <th className="num">Destinatarios</th>
              <th className="num">Enviados</th>
              <th className="num">Fallidos</th>
              <th>Usuario</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr>
                <td colSpan={7} className="ledger-empty">
                  Todavía no se ha enviado ninguna promoción.
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td data-label="Fecha">{formatDateTime(campaign.createdAt)}</td>
                  <td data-label="Asunto">{campaign.subject}</td>
                  <td data-label="Audiencia">
                    {AUDIENCE_LABELS[campaign.audience as Audience] ?? campaign.audience}
                  </td>
                  <td className="num" data-label="Destinatarios">{campaign.recipients}</td>
                  <td className="num" data-label="Enviados">{campaign.sent}</td>
                  <td className="num" data-label="Fallidos">
                    {campaign.failed > 0 ? (
                      <span className="stock-badge stock-zero">{campaign.failed}</span>
                    ) : (
                      "0"
                    )}
                  </td>
                  <td data-label="Usuario">{campaign.userName}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
