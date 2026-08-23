import { apiFetch } from '@/lib/api/client'
import type { User } from '@/lib/api/types'
import { getUserIdFromToken } from '@/lib/auth/token'

/** `GET /users/{id}` */
export function getUser(userId: number): Promise<User> {
  return apiFetch<User>(`/users/${userId}`)
}

/**
 * The signed-in user.
 *
 * The backend has no `/users/me`, so the id comes from the access token's `sub`
 * claim and we fetch by id. Rejects rather than returning null when there is no
 * token, so a caller can't mistake "signed out" for "still loading".
 */
export function getCurrentUser(): Promise<User> {
  const userId = getUserIdFromToken()
  if (userId === null) return Promise.reject(new Error('Not signed in'))
  return getUser(userId)
}

/** `PATCH /users/{id}` — only the owner of the account may call this. */
export function updateUser(
  userId: number,
  patch: { email?: string; name?: string; avatar_url?: string | null },
): Promise<User> {
  return apiFetch<User>(`/users/${userId}`, { method: 'PATCH', body: patch })
}
