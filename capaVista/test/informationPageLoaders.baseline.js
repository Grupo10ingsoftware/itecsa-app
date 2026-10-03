// Test-only baseline: identical lazy pages, with optional code preloading disabled.
// Selected only by the benchmark Vite alias; never imported by the application build.
import { APP_ROUTES } from '../src/config/routes'
export const informationPageLoaders = Object.freeze({
  [APP_ROUTES.DOCUMENTS]: () => import('../src/modules/privacy/pages/DocumentsPage'),
  [APP_ROUTES.DATA_REQUESTS]: () => import('../src/modules/privacy/pages/DataRequestsPage'),
  [APP_ROUTES.INCIDENT_REPORT]: () => import('../src/modules/security/pages/IncidentReportPage'),
})
export function preloadInformationPage() {}
export function preloadInformationPages() {}
