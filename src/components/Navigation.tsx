import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import '../css/Navigation.css'

function Navigation() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [workGroup, setWorkGroup] = useState(true)

  const closeSidebar = () => setSidebarOpen(false)

  return (
    <>
      {/* Top bar */}
      <header className="nav-topbar">
        <button className="nav-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu">
          ☰
        </button>
        <NavLink to="/" className="nav-brand-link">⚡ Silver</NavLink>
      </header>

      {/* Overlay */}
      {sidebarOpen && <div className="nav-overlay" onClick={closeSidebar} />}

      {/* Sidebar */}
      <aside className={`nav-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="nav-sidebar-header">
          <span className="nav-sidebar-title">⚡ Silver</span>
          <button className="nav-sidebar-close" onClick={closeSidebar}>✕</button>
        </div>

        <nav className="nav-menu">
          <NavLink to="/" className="nav-item" onClick={closeSidebar}>
            <span className="nav-icon">🏠</span> Home
          </NavLink>
          <NavLink to="/vocabulary" className="nav-item" onClick={closeSidebar}>
            <span className="nav-icon">🇸🇪</span> Vocabulary
          </NavLink>
          <NavLink to="/releases" className="nav-item" onClick={closeSidebar}>
            <span className="nav-icon">🚀</span> Releases
          </NavLink>
          <NavLink to="/expenses" className="nav-item nav-item-locked" onClick={closeSidebar}>
            <span className="nav-icon">🔒</span> Expenses
          </NavLink>

          {/* Work Tools Group */}
          <div className="nav-group">
            <button className="nav-group-toggle" onClick={() => setWorkGroup(!workGroup)}>
              <span className="nav-icon">🛠️</span> Work Tools
              <span className="nav-group-arrow">{workGroup ? '▼' : '▶'}</span>
            </button>
            {workGroup && (
              <div className="nav-group-items">
                <NavLink to="/ex-systems" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">🖥️</span> ExSystems
                </NavLink>
                <NavLink to="/jira" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">📋</span> Jira
                </NavLink>
                <NavLink to="/quickAccess" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">⚡</span> Quick Access
                </NavLink>
                <NavLink to="/errors" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">🐛</span> Errors
                </NavLink>
                <NavLink to="/ops" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">⚙️</span> Ops
                </NavLink>
                <NavLink to="/soupReq" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">📦</span> SOUP Req
                </NavLink>
                <NavLink to="/fields" className="nav-item nav-item-sub" onClick={closeSidebar}>
                  <span className="nav-icon">📄</span> Fields
                </NavLink>
              </div>
            )}
          </div>
        </nav>
      </aside>
    </>
  )
}

export default Navigation
