import { apiFetch } from '@/lib/api/client'

/** `GET /health` — unauthenticated; the only endpoint safe to poll pre-login. */
export function checkHealth(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>('/health', { auth: false })
}
