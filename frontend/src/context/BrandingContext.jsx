import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import axios from 'axios'
import { mediaUrl } from '../api'

const BrandingContext = createContext({
  logoUrl: null,
  faviconUrl: null,
  loading: true,
  refreshBranding: async () => {},
  setLogoUrl: () => {},
  setFaviconUrl: () => {},
})

const applyFavicon = (url) => {
  const existing = document.querySelectorAll("link[data-ematchday-favicon='1']")
  existing.forEach((el) => el.remove())

  if (!url) return

  const ext = url.split('.').pop()?.toLowerCase()
  let type = 'image/png'
  if (ext === 'ico') type = 'image/x-icon'
  else if (ext === 'svg') type = 'image/svg+xml'
  else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg'
  else if (ext === 'webp') type = 'image/webp'
  else if (ext === 'gif') type = 'image/gif'

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = type
  link.href = url
  link.setAttribute('data-ematchday-favicon', '1')
  document.head.appendChild(link)

  const apple = document.createElement('link')
  apple.rel = 'apple-touch-icon'
  apple.href = url
  apple.setAttribute('data-ematchday-favicon', '1')
  document.head.appendChild(apple)
}

export const BrandingProvider = ({ children }) => {
  const [logoUrl, setLogoUrl] = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshBranding = useCallback(async () => {
    try {
      const res = await axios.get('/api/settings/branding')
      const branding = res.data.branding || {}
      setLogoUrl(mediaUrl(branding.logoUrl) || null)
      setFaviconUrl(mediaUrl(branding.faviconUrl) || null)
    } catch (error) {
      console.error('Failed to load branding:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshBranding()
  }, [refreshBranding])

  useEffect(() => {
    applyFavicon(faviconUrl)
  }, [faviconUrl])

  const value = useMemo(
    () => ({
      logoUrl,
      faviconUrl,
      loading,
      refreshBranding,
      setLogoUrl,
      setFaviconUrl,
    }),
    [logoUrl, faviconUrl, loading, refreshBranding]
  )

  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  )
}

export const useBranding = () => useContext(BrandingContext)
