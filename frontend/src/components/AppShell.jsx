const AppShell = ({ children, withNavPadding = true, className = '' }) => {
  return (
    <div className={`app-atmosphere ${className}`.trim()}>
      <div className={withNavPadding ? 'page-shell' : 'page-shell page-shell--auth'}>
        {children}
      </div>
    </div>
  )
}

export default AppShell
