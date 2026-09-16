import axios from 'axios'

/**
 * Backend origin for production (Vercel).
 * Empty in local dev → relative URLs hit the Vite proxy.
 */
export const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

axios.defaults.baseURL = API_BASE_URL || undefined

/**
 * Turn a stored media path (/uploads/...) into an absolute URL when the API
 * lives on a different host than the frontend (Vercel + Render).
 * Absolute http(s) / blob / data URLs are returned unchanged.
 */
export function mediaUrl(path) {
  if (!path) return path
  if (/^(https?:|blob:|data:)/i.test(path)) return path
  if (!API_BASE_URL) return path
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`
}

export default axios
