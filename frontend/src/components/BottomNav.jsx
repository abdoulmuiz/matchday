import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const NAV_ITEMS = [
  { path: '/home', icon: '⌂', label: 'Home' },
  { path: '/browse-tournaments', icon: '◈', label: 'Matches' },
  { path: '/create-tournament', icon: '+', label: 'Create' },
  { path: '/notifications', icon: '◉', label: 'Alerts', showBadge: true },
  { path: '/profile', icon: '◎', label: 'Profile' },
]

const BottomNav = ({ unreadCount: unreadProp }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadCount: unreadFromAuth } = useAuth() || {}
  const unreadCount = typeof unreadProp === 'number' ? unreadProp : (unreadFromAuth || 0)

  return (
    <nav className="bottom-nav" aria-label="Main">
      {NAV_ITEMS.map((item) => {
        const isActive = location.pathname === item.path
        return (
          <motion.button
            key={item.path}
            type="button"
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
            onClick={() => navigate(item.path)}
            whileTap={{ scale: 0.92 }}
            transition={{ duration: 0.15 }}
          >
            <span className="bottom-nav__icon">
              {item.icon}
              {item.showBadge && unreadCount > 0 && (
                <span className="bottom-nav__badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </motion.button>
        )
      })}
    </nav>
  )
}

export default BottomNav
