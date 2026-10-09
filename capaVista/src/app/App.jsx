import AppProviders from './providers/AppProviders'
import AppRouter from './router'
import AppErrorBoundary from '../shared/components/errors/AppErrorBoundary.jsx'

function App() {
  return (
    <AppErrorBoundary>
      <AppProviders>
        <AppRouter />
      </AppProviders>
    </AppErrorBoundary>
  )
}

export default App
