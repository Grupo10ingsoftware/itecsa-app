import { APP_ROUTES } from '../config/routes'

// Share the exact imports between React.lazy and optional code preloading.
export const informationPageLoaders = Object.freeze({
  [APP_ROUTES.DOCUMENTS]: () => import('../modules/privacy/pages/DocumentsPage'),
  [APP_ROUTES.DATA_REQUESTS]: () => import('../modules/privacy/pages/DataRequestsPage'),
  [APP_ROUTES.INCIDENT_REPORT]: () => import('../modules/security/pages/IncidentReportPage'),
})

export function preloadInformationPage(path) {
  // Preloading is optional: a failed download must not interrupt the current page.
  informationPageLoaders[path]?.().catch(() => {})
}

export function preloadInformationPages() {
  Object.keys(informationPageLoaders).forEach(preloadInformationPage)
}
