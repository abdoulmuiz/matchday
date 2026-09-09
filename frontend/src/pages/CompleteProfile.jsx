import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { motion } from 'framer-motion'
import AppShell from '../components/AppShell'
import BrandMark from '../components/BrandMark'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'

const CompleteProfile = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    in_game_id: '',
    profile_picture_url: '',
    country: '',
    city: '',
    platform: '',
  })
  const [previewUrl, setPreviewUrl] = useState(null)
  const [uploadingPic, setUploadingPic] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await axios.get('/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        })
        const user = response.data.user
        if (user.inGameId) {
          setFormData({
            in_game_id: user.inGameId || '',
            profile_picture_url: user.profilePictureUrl || '',
            country: user.country || '',
            city: user.city || '',
            platform: user.platform || '',
          })
          setPreviewUrl(user.profilePictureUrl || null)
          setIsEditing(true)
        } else if (user.profilePictureUrl) {
          setFormData((prev) => ({ ...prev, profile_picture_url: user.profilePictureUrl }))
          setPreviewUrl(user.profilePictureUrl)
        }
      } catch (error) {
        console.error('Error fetching profile:', error)
      }
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setErrors({ ...errors, avatar: 'Please choose an image file' })
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setErrors({ ...errors, avatar: 'Image must be under 3MB' })
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreviewUrl(localPreview)
    setErrors({ ...errors, avatar: '' })
    setUploadingPic(true)

    try {
      const token = localStorage.getItem('token')
      const body = new FormData()
      body.append('avatar', file)
      const response = await axios.post('/api/profile/upload-picture', body, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      })
      setFormData((prev) => ({
        ...prev,
        profile_picture_url: response.data.profilePictureUrl,
      }))
      setPreviewUrl(response.data.profilePictureUrl)
    } catch (error) {
      setErrors({
        ...errors,
        avatar: error.response?.data?.error || 'Failed to upload picture',
      })
    } finally {
      setUploadingPic(false)
      e.target.value = ''
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.in_game_id || formData.in_game_id.trim() === '') {
      newErrors.in_game_id = 'In-game ID is required'
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      await axios.put('/api/profile', formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      navigate(isEditing ? '/profile' : '/home')
    } catch (error) {
      setErrors({
        submit: error.response?.data?.error || 'Profile update failed. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    if (!formData.in_game_id || formData.in_game_id.trim() === '') {
      setErrors({ in_game_id: 'In-game ID is required to continue' })
      return
    }
    handleSubmit({ preventDefault: () => {} })
  }

  const initial = (formData.in_game_id || '?').charAt(0).toUpperCase()

  return (
    <AppShell withNavPadding={false}>
      <motion.div
        className="auth-panel"
        style={{ maxWidth: 500 }}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="panel-pad" padding="32px">
          <BrandMark />

          <h2 style={{ fontSize: 28, marginBottom: 8 }}>
            {isEditing ? 'Edit Profile' : 'Complete Your Profile'}
          </h2>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 24 }}>
            {isEditing
              ? 'Update your profile information below.'
              : 'Tell us about yourself to get started with tournaments.'}
          </p>

          {errors.submit && <div className="alert alert--error">{errors.submit}</div>}

          <form onSubmit={handleSubmit}>
            <div className="pf-edit-avatar" style={{ marginBottom: 24 }}>
              <label className="field-label">Profile picture (optional)</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  marginTop: 8,
                }}
              >
                <div
                  className="pf-avatar"
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: '50%',
                    overflow: 'hidden',
                    background: 'var(--accent-lime-soft)',
                    border: '2px solid var(--border-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 28,
                    fontWeight: 700,
                    color: 'var(--accent-lime)',
                    flexShrink: 0,
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span>{initial}</span>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <input
                    id="avatar-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarSelect}
                    style={{ display: 'none' }}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    loading={uploadingPic}
                    disabled={uploadingPic}
                    onClick={() => document.getElementById('avatar-input')?.click()}
                  >
                    {uploadingPic ? 'Uploading…' : previewUrl ? 'Change photo' : 'Add photo'}
                  </Button>
                  <p className="text-muted" style={{ fontSize: 12, marginTop: 8, marginBottom: 0 }}>
                    JPEG, PNG, WebP or GIF · max 3MB
                  </p>
                  {errors.avatar && (
                    <p style={{ color: 'var(--error-red)', fontSize: 13, marginTop: 6 }}>
                      {errors.avatar}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Input
              label="In-Game ID"
              type="text"
              name="in_game_id"
              value={formData.in_game_id}
              onChange={handleChange}
              placeholder="Your eFootball in-game ID"
              className="mono"
              error={errors.in_game_id}
              required
            />

            <div style={{ marginBottom: 16 }}>
              <label className="field-label">Platform (Optional)</label>
              <select name="platform" value={formData.platform} onChange={handleChange}>
                <option value="">Select platform</option>
                <option value="PS">PlayStation</option>
                <option value="Xbox">Xbox</option>
                <option value="PC">PC</option>
                <option value="Mobile">Mobile</option>
              </select>
            </div>

            <Input
              label="Country (Optional)"
              type="text"
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Your country"
            />

            <Input
              label="City (Optional)"
              type="text"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Your city"
            />

            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading || uploadingPic}
              style={{ marginBottom: 12 }}
            >
              {isEditing ? 'Save Changes' : 'Complete Profile'}
            </Button>

            {!isEditing && (
              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleSkip}
                disabled={loading || uploadingPic}
              >
                Skip for Now
              </Button>
            )}
          </form>

          {isEditing && (
            <div className="text-center" style={{ marginTop: 24 }}>
              <button type="button" className="link-btn" onClick={() => navigate('/profile')}>
                Cancel
              </button>
            </div>
          )}
        </Card>
      </motion.div>
    </AppShell>
  )
}

export default CompleteProfile
