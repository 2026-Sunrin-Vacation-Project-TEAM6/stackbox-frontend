import { apiFetch } from '@/lib/api/client'
import type { Workspace, WorkspaceMember, WorkspaceRole } from '@/lib/api/types'

/** `GET /workspaces` — workspaces you own or are a member of. */
export function listWorkspaces(): Promise<Workspace[]> {
  return apiFetch<Workspace[]>('/workspaces')
}

/** `GET /workspaces/{id}` */
export function getWorkspace(workspaceId: number): Promise<Workspace> {
  return apiFetch<Workspace>(`/workspaces/${workspaceId}`)
}

/** `POST /workspaces` — the caller becomes `owner_id`. */
export function createWorkspace(input: {
  name: string
  slug: string
  description?: string
  icon?: string | null
}): Promise<Workspace> {
  return apiFetch<Workspace>('/workspaces', { method: 'POST', body: input })
}

/** `PATCH /workspaces/{id}` — requires admin or above. */
export function updateWorkspace(
  workspaceId: number,
  patch: { name?: string; slug?: string; description?: string; icon?: string | null },
): Promise<Workspace> {
  return apiFetch<Workspace>(`/workspaces/${workspaceId}`, { method: 'PATCH', body: patch })
}

/** `DELETE /workspaces/{id}` — owner only; cascades to its stack boxes. */
export function deleteWorkspace(workspaceId: number): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}`, { method: 'DELETE' })
}

/** `GET /workspaces/{id}/members` */
export function listMembers(workspaceId: number): Promise<WorkspaceMember[]> {
  return apiFetch<WorkspaceMember[]>(`/workspaces/${workspaceId}/members`)
}

/** `POST /workspaces/{id}/members` — requires admin or above. */
export function addMember(
  workspaceId: number,
  input: { user_id: number; role: WorkspaceRole },
): Promise<WorkspaceMember> {
  return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members`, {
    method: 'POST',
    body: input,
  })
}

/** `PATCH /workspaces/{id}/members/{memberId}` — requires admin or above. */
export function updateMemberRole(
  workspaceId: number,
  memberId: number,
  role: WorkspaceRole,
): Promise<WorkspaceMember> {
  return apiFetch<WorkspaceMember>(`/workspaces/${workspaceId}/members/${memberId}`, {
    method: 'PATCH',
    body: { role },
  })
}

/** `DELETE /workspaces/{id}/members/{memberId}` — requires admin or above. */
export function removeMember(workspaceId: number, memberId: number): Promise<void> {
  return apiFetch<void>(`/workspaces/${workspaceId}/members/${memberId}`, { method: 'DELETE' })
}

/**
 * 8 random hex chars via `getRandomValues`, which — unlike `randomUUID` — is
 * available outside secure contexts (plain HTTP on a non-localhost host).
 */
function randomHexSuffix(length: number): string {
  const bytes = new Uint8Array(Math.ceil(length / 2))
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length)
}

/**
 * Derives a URL slug from a workspace name.
 *
 * `workspaces.slug` is globally unique across all users and the backend does
 * not catch the integrity error, so a bare `my-notes` would 500 as soon as any
 * other account had claimed it. The random suffix makes the collision
 * effectively impossible; `slugify` alone would not.
 */
export function deriveSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    // Keep Hangul: a Korean workspace name would otherwise slugify to nothing.
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

  const suffix = randomHexSuffix(8)
  return base ? `${base}-${suffix}` : suffix
}
