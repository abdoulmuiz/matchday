import { useEffect, useState } from 'react'
import axios from 'axios'
import Button from '../../components/Button'
import { useBranding } from '../../context/BrandingContext'

const authHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

const AdminBranding = () => {
  const {
    logoUrl,
    faviconUrl,
    setLogoUrl,
    setFaviconUrl,
    refreshBranding,
  } = useBranding()
  const [logoPreview, setLogoPreview] = useState(logoUrl)
  const [faviconPreview, setFaviconPreview] = useState(faviconUrl)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [resettingLogo, setResettingLogo] = useState(false)
  const [resettingFavicon, setResettingFavicon] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    setLogoPreview(logoUrl)
  }, [logoUrl])

  useEffect(() => {
    setFaviconPreview(faviconUrl)
  }, [faviconUrl])

  const applyBranding = (branding) => {
    setLogoUrl(branding?.logoUrl || null)
    setFaviconUrl(branding?.faviconUrl || null)
    setLogoPreview(branding?.logoUrl || null)
    setFaviconPreview(branding?.faviconUrl || null)
  }

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file for the logo')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB')
      return
    }

    setUploadingLogo(true)
    setError('')
    setSuccess('')

    try {
      const body = new FormData()
      body.append('logo', file)
      const res = await axios.post('/api/admin/branding/logo', body, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      })
      applyBranding(res.data.branding)
      setSuccess('Website logo updated.')
      await refreshBranding()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      e.target.value = ''
    }
  }

  const handleFaviconUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const okType =
      file.type.startsWith('image/') ||
      file.name.toLowerCase().endsWith('.ico')
    if (!okType) {
      setError('Please choose an ICO, PNG, JPEG, WebP, or GIF for the favicon')
      return
    }
    if (file.size > 1 * 1024 * 1024) {
      setError('Favicon must be under 1MB')
      return
    }

    setUploadingFavicon(true)
    setError('')
    setSuccess('')

    try {
      const body = new FormData()
      body.append('favicon', file)
      const res = await axios.post('/api/admin/branding/favicon', body, {
        headers: {
          ...authHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      })
      applyBranding(res.data.branding)
      setSuccess('Favicon updated. Check the browser tab icon.')
      await refreshBranding()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload favicon')
    } finally {
      setUploadingFavicon(false)
      e.target.value = ''
    }
  }

  const handleResetLogo = async () => {
    if (!window.confirm('Reset to the default EF mark?')) return
    setResettingLogo(true)
    setError('')
    setSuccess('')
    try {
      const res = await axios.delete('/api/admin/branding/logo', {
        headers: authHeaders(),
      })
      applyBranding(res.data.branding)
      setSuccess('Logo reset to default.')
      await refreshBranding()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset logo')
    } finally {
      setResettingLogo(false)
    }
  }

  const handleResetFavicon = async () => {
    if (!window.confirm('Remove the custom favicon?')) return
    setResettingFavicon(true)
    setError('')
    setSuccess('')
    try {
      const res = await axios.delete('/api/admin/branding/favicon', {
        headers: authHeaders(),
      })
      applyBranding(res.data.branding)
      setSuccess('Favicon removed.')
      await refreshBranding()
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset favicon')
    } finally {
      setResettingFavicon(false)
    }
  }

  const busy =
    uploadingLogo || uploadingFavicon || resettingLogo || resettingFavicon

  return (
    <div className="admin-page">
      <header className="admin-page__head">
        <h2>Branding</h2>
        <p className="text-muted">
          Change the website logo and browser favicon (tab icon).
        </p>
      </header>

      {error && <div className="alert alert--error mb-4">{error}</div>}
      {success && <div className="alert alert--success mb-4">{success}</div>}

      <section className="admin-panel">
        <h3 className="admin-panel__title">Website logo</h3>
        <div className="admin-logo-preview">
          {logoPreview ? (
            <img src={logoPreview} alt="Current website logo" />
          ) : (
            <div className="admin-logo-preview__default" aria-hidden>
              EF
            </div>
          )}
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              {logoPreview ? 'Custom logo' : 'Default EF mark'}
            </p>
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              Shown on login, signup, and branded screens. Square PNG/WebP under 2MB works best.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <input
            id="admin-logo-input"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleLogoUpload}
            style={{ display: 'none' }}
          />
          <Button
            type="button"
            loading={uploadingLogo}
            disabled={busy}
            onClick={() => document.getElementById('admin-logo-input')?.click()}
          >
            {logoPreview ? 'Replace logo' : 'Upload logo'}
          </Button>
          {logoPreview && (
            <Button
              type="button"
              variant="secondary"
              loading={resettingLogo}
              disabled={busy}
              onClick={handleResetLogo}
            >
              Reset logo
            </Button>
          )}
        </div>
      </section>

      <section className="admin-panel">
        <h3 className="admin-panel__title">Favicon</h3>
        <div className="admin-logo-preview">
          {faviconPreview ? (
            <img
              src={faviconPreview}
              alt="Current favicon"
              style={{ width: 48, height: 48, borderRadius: 10 }}
            />
          ) : (
            <div
              className="admin-logo-preview__default"
              style={{ width: 48, height: 48, fontSize: 16, borderRadius: 10 }}
              aria-hidden
            >
              ◈
            </div>
          )}
          <div>
            <p style={{ margin: '0 0 6px', fontWeight: 600 }}>
              {faviconPreview ? 'Custom favicon' : 'No custom favicon'}
            </p>
            <p className="text-muted" style={{ fontSize: 13, margin: 0 }}>
              Browser tab icon. ICO or square PNG (32×32 or 64×64), under 1MB.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
          <input
            id="admin-favicon-input"
            type="file"
            accept="image/x-icon,image/vnd.microsoft.icon,.ico,image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFaviconUpload}
            style={{ display: 'none' }}
          />
          <Button
            type="button"
            loading={uploadingFavicon}
            disabled={busy}
            onClick={() => document.getElementById('admin-favicon-input')?.click()}
          >
            {faviconPreview ? 'Replace favicon' : 'Upload favicon'}
          </Button>
          {faviconPreview && (
            <Button
              type="button"
              variant="secondary"
              loading={resettingFavicon}
              disabled={busy}
              onClick={handleResetFavicon}
            >
              Remove favicon
            </Button>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminBranding
