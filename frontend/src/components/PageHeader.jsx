import { useNavigate } from 'react-router-dom'

const PageHeader = ({ title, showBack = true, onBack, children }) => {
  const navigate = useNavigate()

  const handleBack = () => {
    if (onBack) onBack()
    else navigate(-1)
  }

  return (
    <header className="page-header">
      {showBack && (
        <button type="button" className="page-header__back" onClick={handleBack} aria-label="Go back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
      )}
      <h1 className="page-header__title">{title}</h1>
      {children && <div className="page-header__actions">{children}</div>}
    </header>
  )
}

export default PageHeader
