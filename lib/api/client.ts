import { getAccessToken } from '@/lib/auth/token'

const API_BASE = process.env.NEXT_PUBLIC_API_URL!

type ApiOptions = RequestInit & {
  auth?: boolean
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options

  const authHeaders: HeadersInit = {}
  if (auth) {
    const token = getAccessToken()
    if (token) authHeaders['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    },
    ...rest,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `API Error ${response.status}`)
  }

  return response.json() as Promise<T>
}