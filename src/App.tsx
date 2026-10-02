import { useState } from 'react'
import { useAuth } from './context/AuthContext'
import AuthPage from './components/AuthPage'
import Dashboard, { type DashboardSelection } from './components/Dashboard'
import QuestionBank, { type SelectedQuestions } from './components/QuestionBank'
import PaperPreview from './components/PaperPreview'
import './styles/app.css'

type View = 'dashboard' | 'questionBank' | 'paperPreview'

export default function App() {
  const { user, loading, signOut } = useAuth()
  const [view, setView] = useState<View>('dashboard')
  const [selection, setSelection] = useState<DashboardSelection | null>(null)
  const [selectedQuestions, setSelectedQuestions] = useState<SelectedQuestions | null>(null)

  if (loading) {
    return (
      <div className="auth-page">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  const handleProceed = (sel: DashboardSelection) => {
    setSelection(sel)
    setView('questionBank')
  }

  const handlePreview = (qs: SelectedQuestions) => {
    setSelectedQuestions(qs)
    setView('paperPreview')
  }

  const handleReset = () => {
    setSelection(null)
    setSelectedQuestions(null)
    setView('dashboard')
  }

  const handleBackToDashboard = () => {
    setView('dashboard')
  }

  const handleBackToQuestions = () => {
    setView('questionBank')
  }

  return (
    <div>
      <header className="app-header">
        <h1>
          <span className="logo-icon">QP</span>
          Question Paper Generator
        </h1>
        <div className="header-right">
          <span className="user-email">{user.email}</span>
          <button className="btn btn-outline btn-sm" onClick={signOut}>Logout</button>
        </div>
      </header>

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard onProceed={handleProceed} />
        )}
        {view === 'questionBank' && selection && (
          <QuestionBank
            selection={selection}
            onBack={handleBackToDashboard}
            onPreview={handlePreview}
          />
        )}
        {view === 'paperPreview' && selection && selectedQuestions && (
          <PaperPreview
            selection={selection}
            selectedQuestions={selectedQuestions}
            onBack={handleBackToQuestions}
            onSaved={handleReset}
          />
        )}
      </main>
    </div>
  )
}
