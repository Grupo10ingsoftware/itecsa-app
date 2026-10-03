import { renderToStaticMarkup } from 'react-dom/server'
import { AuthContext } from '../src/app/providers/authContext'
import ProfilePage from '../src/modules/profile/pages/ProfilePage'
import { ROLES } from '../src/config/roles'
import assert from 'node:assert/strict'
import { formatProfileDate } from '../src/modules/profile/utils/profileFormatters'

export function run() {
  for (const role of Object.values(ROLES)) {
    for (const pinStatus of ['active', 'pending_acknowledgement']) {
      const html = renderToStaticMarkup(
        <AuthContext.Provider value={{ user: { rolUsuario: role, sub: 'test' }, pinStatus }}>
          <ProfilePage />
        </AuthContext.Provider>,
      )
      assert.equal(html.includes('Generar nuevo PIN (debug)'), import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ROUTES === 'true' && role === ROLES.SOPORTE && pinStatus === 'active')
    }
  }

  assert.equal(formatProfileDate('2026-09-07T12:00:00Z'), '07-09-2026')
  assert.equal(formatProfileDate('2026-08-05T02:00:00Z'), '04-08-2026')
  assert.equal(formatProfileDate('2026-01-01T01:00:00Z'), '31-12-2025')
  assert.equal(formatProfileDate(null), 'Fecha no disponible')
  assert.equal(formatProfileDate('invalid'), 'Fecha no disponible')
  console.log('5 verificaciones frontend: fechas del perfil y zona horaria de Chile OK')
}
