import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navigation from './components/Navigation'
import ExpenseAuth from './components/ExpenseAuth'
import Home from './pages/Home'
import Fields from './pages/Fields'
import Ops from './pages/Ops'
import SoupReq from './pages/SoupReq'
import Jira from './pages/Jira'
import QuickAccess from './pages/QuickAccess'
import Vocabulary from './pages/Vocabulary'
import ErrorTracker from './pages/ErrorTracker'
import Releases from './pages/Releases'
import Expenses from './pages/Expenses'
import ExSystems from './pages/ExSystems'
import './css/App.css'

const BASE_TITLE = 'Silver'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Home',
  '/fields': 'Fields',
  '/ops': 'Ops',
  '/soupReq': 'SOUP Req',
  '/jira': 'Jira',
  '/quickAccess': 'Quick Access',
  '/vocabulary': 'Vocabulary',
  '/errors': 'Errors',
  '/releases': 'Releases',
  '/expenses': 'Expenses',
  '/ex-systems': 'ExSystems',
}

function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    const pageName = PAGE_TITLES[location.pathname]
    document.title = pageName ? `${pageName} · ${BASE_TITLE}` : BASE_TITLE
  }, [location.pathname])

  return null
}

function App() {
  return (
    <>
      <PageTitle />
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fields" element={<Fields />} />
        <Route path="/ops" element={<Ops />} />
        <Route path="/soupReq" element={<SoupReq />} />
        <Route path="/jira" element={<Jira />} />
        <Route path="/quickAccess" element={<QuickAccess />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="/errors" element={<ErrorTracker />} />
        <Route path="/releases" element={<Releases />} />
        <Route path="/expenses" element={<ExpenseAuth><Expenses /></ExpenseAuth>} />
        <Route path="/ex-systems" element={<ExSystems />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
