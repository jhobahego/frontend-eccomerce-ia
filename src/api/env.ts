/**
 * The API base URL comes from the environment only — never hardcoded
 * (constitution §5, principle 12). Copy `.env.example` to `.env` and set it.
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env['VITE_API_URL']
  const url = typeof raw === 'string' ? raw.trim().replace(/\/+$/, '') : ''
  if (url === '') {
    throw new Error(
      'VITE_API_URL is not set. Copy .env.example to .env and point it at the backend API.',
    )
  }
  if (!/^https?:\/\//i.test(url)) {
    throw new Error('VITE_API_URL must be an http(s) URL.')
  }
  return url
}
