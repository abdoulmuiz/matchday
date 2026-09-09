import { useBranding } from '../context/BrandingContext'

const BrandMark = ({ size = 'md', showTag = true, centered = true }) => {
  const { logoUrl } = useBranding()
  const sizes = {
    sm: { box: 40, font: 20, title: 28 },
    md: { box: 56, font: 28, title: 44 },
    lg: { box: 64, font: 32, title: 52 },
  }
  const s = sizes[size] || sizes.md

  return (
    <div className="auth-brand" style={{ textAlign: centered ? 'center' : 'left' }}>
      {logoUrl ? (
        <div
          className="auth-brand__mark auth-brand__mark--image"
          style={{ width: s.box, height: s.box }}
          aria-hidden
        >
          <img src={logoUrl} alt="" />
        </div>
      ) : (
        <div
          className="auth-brand__mark"
          style={{ width: s.box, height: s.box, fontSize: s.font }}
          aria-hidden
        >
          EF
        </div>
      )}
      <h1 className="auth-brand__title" style={{ fontSize: s.title }}>
        MatchDay
      </h1>
      {showTag && <p className="auth-brand__tag">Play. Compete. Win.</p>}
    </div>
  )
}

export default BrandMark
