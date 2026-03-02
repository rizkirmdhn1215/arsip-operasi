import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { LoginPage } from './components/LoginPage.tsx'
import { useAuth } from './hooks/useAuth.ts'
import { Loader2, Shield } from 'lucide-react'

function Root() {
  const { session, loading, login, logout, loginError, loggingIn } = useAuth()

  // Full-screen loader while checking for existing session
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-[#1B3A6B]/5 to-[#F37021]/5">
        <div className="w-14 h-14 rounded-full bg-[#F37021] flex items-center justify-center shadow-lg">
          <Shield className="h-7 w-7 text-white" />
        </div>
        <Loader2 className="h-6 w-6 animate-spin text-[#F37021]" />
        <p className="text-muted-foreground text-sm">Memverifikasi sesi...</p>
      </div>
    )
  }

  // Not authenticated → show login page
  if (!session) {
    return (
      <LoginPage
        onLogin={login}
        loginError={loginError}
        loggingIn={loggingIn}
      />
    )
  }

  // Authenticated → show main app
  return <App onLogout={logout} userEmail={session.user.email ?? ''} />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
