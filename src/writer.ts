import * as fs from 'node:fs'
import * as path from 'node:path'
import type { Plan } from './parser'

export type Action =
  | 'created' // file did not exist, created empty
  | 'filled' // file did not exist, created with content
  | 'overwritten' // existed, replaced (--force)
  | 'skipped-exists'
  | 'skipped-binary'
  | 'dir-created'
  | 'dir-exists'
  | 'error'

export interface Result {
  path: string
  action: Action
  note?: string
}

export interface ApplyOptions {
  cwd: string
  dryRun?: boolean
  force?: boolean
  noRoot?: boolean
}

const BINARY_EXT = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'icns', 'tif', 'tiff', 'avif', 'heic', 'psd',
  'pdf', 'zip', 'tar', 'gz', 'tgz', '7z', 'rar', 'bz2', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'class', 'jar', 'o', 'a', 'wasm',
  'woff', 'woff2', 'ttf', 'otf', 'eot',
  'mp3', 'mp4', 'wav', 'ogg', 'mov', 'avi', 'webm', 'flac', 'mkv',
  'sqlite', 'sqlite3', 'db', 'pyc'
])

export function isBinaryPath (p: string): boolean {
  const ext = path.extname(p).slice(1).toLowerCase()
  return ext !== '' && BINARY_EXT.has(ext)
}

/** Validate a relative path from untrusted pasted text. Returns an error message or null. */
export function validateRel (rel: string): string | null {
  if (!rel) return 'path kosong'
  if (rel.includes('\0')) return 'path mengandung karakter NUL'
  if (path.isAbsolute(rel) || /^[a-zA-Z]:/.test(rel) || rel.startsWith('/') || rel.startsWith('\\')) {
    return 'path absolut ditolak'
  }
  if (rel.split('/').some(seg => seg === '..')) return 'path keluar dari folder kerja (..) ditolak'
  return null
}

function isInside (child: string, parent: string): boolean {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Real path of the nearest existing ancestor (guards against symlink escapes). */
function realAncestor (p: string): string {
  let cur = p
  while (!fs.existsSync(cur)) {
    const up = path.dirname(cur)
    if (up === cur) break
    cur = up
  }
  return fs.realpathSync(cur)
}

/** Decide the folder that entries are written into. */
export function resolveBase (plan: Plan, opts: ApplyOptions): string {
  const cwd = path.resolve(opts.cwd)
  if (!plan.root || opts.noRoot) return cwd
  const sameName = path.basename(cwd).toLowerCase() === plan.root.toLowerCase()
  return sameName ? cwd : path.join(cwd, ...plan.root.split('/'))
}

export function applyPlan (plan: Plan, opts: ApplyOptions): Result[] {
  const results: Result[] = []
  const base = resolveBase(plan, opts)

  const rootErr = plan.root && !opts.noRoot ? validateRel(plan.root) : null
  if (rootErr) {
    return [{ path: plan.root ?? '', action: 'error', note: rootErr }]
  }

  const realCwd = fs.realpathSync(path.resolve(opts.cwd))

  // Make sure the base folder exists (it counts as the root directory entry).
  if (plan.root && !opts.noRoot && base !== path.resolve(opts.cwd)) {
    const existed = fs.existsSync(base)
    if (!opts.dryRun) fs.mkdirSync(base, { recursive: true })
    results.push({ path: plan.root, action: existed ? 'dir-exists' : 'dir-created' })
  }

  for (const entry of plan.entries) {
    const err = validateRel(entry.path)
    if (err) {
      results.push({ path: entry.path, action: 'error', note: err })
      continue
    }

    const full = path.resolve(base, entry.path)
    if (!isInside(full, base) || !isInside(realAncestor(full), realCwd)) {
      results.push({ path: entry.path, action: 'error', note: 'path keluar dari folder kerja ditolak' })
      continue
    }

    try {
      if (entry.type === 'dir') {
        if (fs.existsSync(full)) {
          if (fs.statSync(full).isDirectory()) {
            results.push({ path: entry.path, action: 'dir-exists' })
          } else {
            results.push({ path: entry.path, action: 'error', note: 'sudah ada sebagai file' })
          }
        } else {
          if (!opts.dryRun) fs.mkdirSync(full, { recursive: true })
          results.push({ path: entry.path, action: 'dir-created' })
        }
        continue
      }

      if (isBinaryPath(entry.path)) {
        results.push({ path: entry.path, action: 'skipped-binary', note: 'file biner, dibuat manual' })
        continue
      }

      const exists = fs.existsSync(full)
      if (exists && fs.statSync(full).isDirectory()) {
        results.push({ path: entry.path, action: 'error', note: 'sudah ada sebagai folder' })
        continue
      }
      if (exists && !opts.force) {
        results.push({ path: entry.path, action: 'skipped-exists' })
        continue
      }

      let data = entry.content ?? ''
      if (data !== '' && !data.endsWith('\n')) data += '\n'
      const hasContent = entry.content !== undefined && entry.content !== ''

      if (!opts.dryRun) {
        fs.mkdirSync(path.dirname(full), { recursive: true })
        // 'wx' fails if the file appeared in the meantime, so nothing is overwritten by accident.
        fs.writeFileSync(full, data, { flag: exists ? 'w' : 'wx' })
      }
      results.push({
        path: entry.path,
        action: exists ? 'overwritten' : hasContent ? 'filled' : 'created'
      })
    } catch (e) {
      results.push({ path: entry.path, action: 'error', note: (e as Error).message })
    }
  }
  return results
}
