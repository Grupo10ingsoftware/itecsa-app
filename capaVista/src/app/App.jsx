import AppProviders from './providers/AppProviders'
import AppLayout from '../shared/components/layout/AppLayout'
import { useAuth } from '../hooks/useAuth'
import LoginPage from '../modules/auth/pages/LoginPage'

function AppContent() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AppLayout />
}

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  )
}

export default App
