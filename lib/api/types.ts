/**
 * Wire types, mirroring the FastAPI response models in `backend/app/schemas/`.
 *
 * Field names are snake_case on purpose: these are the payloads as they come
 * off the wire, and renaming them here would mean every call site has to guess
 * which convention it is holding. Conversion to UI-shaped values happens where
 * the UI needs it (see `lib/api/code.ts` for the one case that earns it).
 */

/* ── auth ─────────────────────────────────────────────────────────────────── */

/** `schemas/auth.py: TokenResponse` */
export type TokenResponse = {
  access_token: string
  refresh_token: string
  token_type: string
}

/* ── users ────────────────────────────────────────────────────────────────── */

/** `schemas/user.py: UserRead` */
export type User = {
  id: number
  email: string
  name: string
  avatar_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ── workspaces ───────────────────────────────────────────────────────────── */

/** `models/workspace.py: WorkspaceRole`, ordered weakest → strongest. */
export const WORKSPACE_ROLES = ['viewer', 'editor', 'admin', 'owner'] as const
export type WorkspaceRole = (typeof WORKSPACE_ROLES)[number]

/** `schemas/workspace.py: WorkspaceRead` */
export type Workspace = {
  id: number
  name: string
  slug: string
  description: string
  icon: string | null
  owner_id: number
  created_at: string
  updated_at: string
}

/** `schemas/workspace.py: WorkspaceMemberRead` */
export type WorkspaceMember = {
  id: number
  workspace_id: number
  user_id: number
  role: WorkspaceRole
  invited_by: number | null
  joined_at: string
}

/* ── stack boxes ──────────────────────────────────────────────────────────── */

/** `models/stack_box.py: StackBoxType` */
export type StackBoxType = 'folder' | 'page' | 'canvas' | 'edgeless'

/** `schemas/stack_box.py: StackBoxRead` */
export type StackBox = {
  id: number
  workspace_id: number
  parent_id: number | null
  type: StackBoxType
  name: string
  description: string
  icon: string | null
  cover_url: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

/* ── blocks ───────────────────────────────────────────────────────────────── */

/** `models/block.py: BlockType` — the backend has exactly these two. */
export type BlockType = 'markdown' | 'code'

/** `schemas/block.py: BlockRead` */
export type Block = {
  id: number
  stack_box_id: number
  type: BlockType
  language: string | null
  content: string
  sort_order: number
  pos_x: number | null
  pos_y: number | null
  width: number | null
  height: number | null
  created_by?: number | null
  updated_by?: number | null
  created_at?: string
  updated_at?: string
}

/* ── code execution ───────────────────────────────────────────────────────── */

/**
 * `schemas/code_run.py: CodeRunRead`
 *
 * `compile_error` backs compiled-language support (C/C++/Rust) in the
 * code_runner service and is optional here because that backend work may not
 * be deployed yet — older responses simply omit the key.
 */
export type CodeRun = {
  id: number
  block_id: number
  language: string
  stdout: string
  stderr: string
  exit_code: number
  duration_ms: number
  executed_by: number | null
  created_at: string
  compile_error?: string | null
}

/* ── collaborative documents ──────────────────────────────────────────────── */

/** `schemas/doc.py: DocSnapshotRead` — `blob`/`state` are base64. */
export type DocSnapshot = {
  stack_box_id: number
  blob: string
  state: string | null
  size: number
  version: number
  created_by: number | null
  updated_by: number | null
  created_at: string
  updated_at: string
}

/** `schemas/doc.py: DocUpdateRead` — `blob` is a base64 Yjs update. */
export type DocUpdate = {
  id: number
  stack_box_id: number
  blob: string
  seq: number
  created_by: number | null
  created_at: string
}

/** `schemas/doc.py: CanvasPresenceRead` */
export type CanvasPresence = {
  stack_box_id: number
  user_id: number
  cursor_x: number | null
  cursor_y: number | null
  selection: unknown
  color: string | null
  last_seen_at: string
}

/* ── github ───────────────────────────────────────────────────────────────── */

/** `schemas/github_account.py: GithubAccountRead` */
export type GithubAccount = {
  id: number
  user_id: number
  github_user_id: string
  github_login: string
  connected_at: string
}

/** `schemas/github_account.py: GithubRepoRead` */
export type GithubRepo = {
  owner: string
  name: string
  full_name: string
  private: boolean
  default_branch: string
}

/** `schemas/github_account.py: GithubContentRead` — `type` is git's own vocabulary ("file" | "dir"). */
export type GithubContent = {
  path: string
  name: string
  type: string
  download_url: string | null
}

/** `schemas/github_account.py: GithubImportResult` */
export type GithubImportResult = {
  imported: number
  block_ids: number[]
}

/* ── reactions ────────────────────────────────────────────────────────────── */

/** `schemas/reaction.py: EmojiCatalogEntry` */
export type EmojiCatalogEntry = {
  code: string
  label: string
  image_path: string
}

/** `schemas/reaction.py: ReactionRead` */
export type Reaction = {
  id: number
  stack_box_id: number
  user_id: number
  emoji_code: string
  created_at: string
}

/* ── ai ───────────────────────────────────────────────────────────────────── */

/** `schemas/ai.py: ChatMessage` — the backend rejects a "system" role from clients. */
export type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}
