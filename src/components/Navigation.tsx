import { NavLink } from 'react-router-dom'
import '../css/Navigation.css'

function Navigation() {
  return (
    <nav className="top-nav">
      <ul>
        <li>
          <NavLink to="/">Home</NavLink>
        </li>
        <li>
          <NavLink to="/quickAccess">Quick Access</NavLink>
        </li>
        <li>
          <NavLink to="/jira">Jira</NavLink>
        </li>
        <li>
          <NavLink to="/fields">Fields</NavLink>
        </li>
        <li>
          <NavLink to="/soupReq">SOUP Req</NavLink>
        </li>
        <li>
          <NavLink to="/ops">Ops</NavLink>
        </li>
      </ul>
    </nav>
  )
}

export default Navigation
