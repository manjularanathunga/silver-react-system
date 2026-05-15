import { Routes, Route, Navigate } from 'react-router-dom'
import Navigation from './components/Navigation'
import Home from './pages/Home'
import Fields from './pages/Fields'
import Ops from './pages/Ops'
import SoupReq from './pages/SoupReq'
import Jira from './pages/Jira'
import QuickAccess from './pages/QuickAccess'
import Vocabulary from './pages/Vocabulary'
import './css/App.css'

function App() {
  return (
    <>
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/fields" element={<Fields />} />
        <Route path="/ops" element={<Ops />} />
        <Route path="/soupReq" element={<SoupReq />} />
        <Route path="/jira" element={<Jira />} />
        <Route path="/quickAccess" element={<QuickAccess />} />
        <Route path="/vocabulary" element={<Vocabulary />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
