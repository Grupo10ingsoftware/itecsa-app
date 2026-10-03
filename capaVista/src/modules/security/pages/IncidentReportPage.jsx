import PrivacyPageHeader from '../../privacy/components/PrivacyPageHeader'
import common from '../../privacy/pages/PrivacyPages.module.css'
import IncidentReportForm from '../components/IncidentReportForm'
import IncidentTypesPanel from '../components/IncidentTypesPanel'
import { useIncidentReportsApi } from '../hooks/useIncidentReportsApi'
import { useIncidentConfiguration } from '../hooks/useIncidentConfiguration'

export default function IncidentReportPage() {
  const api = useIncidentReportsApi()
  const { loading, error, reportsEnabled, contactEmail, retry } = useIncidentConfiguration(api)
  return <section className={common.page} aria-label="Reportar incidente">
    <PrivacyPageHeader eyebrow="SEGURIDAD" title="REPORTAR INCIDENTE">
      <p>Informa sobre un posible incidente de seguridad en ItecsaApp.</p>
      <p>Tu reporte nos ayuda a mantener la plataforma segura para todos.</p>
    </PrivacyPageHeader>
    <div className={common.requestsGrid}>
      <IncidentReportForm email={contactEmail} sendReport={api.submit} enabled={!loading && !error && reportsEnabled} checking={loading} configurationError={error} retryConfiguration={retry} />
      <IncidentTypesPanel />
    </div>
  </section>
}
