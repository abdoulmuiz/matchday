import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import AppShell from './AppShell'
import BrandMark from './BrandMark'

const NAV = [
  { to: '/admin', end: true, label: 'Overview' },
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/tournaments', label: 'Tournaments' },
  { to: '/admin/disputes', label: 'Disputes' },
  { to: '/admin/branding', label: 'Branding' },
]

const AdminLayout = () => {
  const navigate = useNavigate()

  return (
    <AppShell>
      <div className="admin-shell">
        <header className="admin-top">
          <div className="admin-top__brand">
            <BrandMark size="sm" showTag={false} centered={false} />
            <div>
              <p className="eyebrow" style={{ marginBottom: 2 }}>
                Operator
              </p>
              <h1 className="admin-top__title">Admin Panel</h1>
            </div>
          </div>
          <button
            type="button"
            className="td-chip-btn"
            onClick={() => navigate('/home')}
          >
            Exit to app
          </button>
        </header>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `admin-nav__link${isActive ? ' admin-nav__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-body">
          <Outlet />
        </div>
      </div>
    </AppShell>
  )
}

export default AdminLayout
