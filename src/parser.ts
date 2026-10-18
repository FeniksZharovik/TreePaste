export interface PlanEntry {
  /** Relative POSIX path, e.g. "src/index.js" */
  path: string
  type: 'dir' | 'file'
  /** File content taken from the "File Contents" section (if any) */
  content?: string
}

export interface Plan {
  /** Name of the root folder from the first tree line, or null if none */
  root: string | null
  entries: PlanEntry[]
  warnings: string[]
}

const CONTENTS_HEADING = /^\s{0,3}#{1,6}\s*(?:file\s+contents?|isi\s+file|isi\s+berkas)\s*:?\s*$/i
const ANY_HEADING = /^\s{0,3}#{1,6}\s+\S/
const FENCE = /^(\s*)(`{3,}|~{3,})\s*(.*)$/
const TREE_PREFIX =
  /^((?:[\s│┃¦]|\|(?!-))*)((?:[├└┣┗╠╚][─━═]*|[|`+\\]-{2,})\s*)?/
/** A name followed by a flag-like token, e.g. "treepaste --clipboard", is a command, not a file. */
const COMMAND_LIKE = /\s--?[A-Za-z]/

const NO_EXT_NAMES = new Set([
  'license', 'licence', 'dockerfile', 'makefile', 'procfile', 'gemfile',
  'rakefile', 'readme', 'changelog', 'jenkinsfile', 'vagrantfile', 'codeowners'
])

interface RawLine {
  col: number
  connector: boolean
  name: string
  explicitDir: boolean
}

/** Normalize a relative path: forward slashes, no leading "./", no trailing "/". */
export function normalizeRel (p: string): string {
  let s = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/')
  while (s.startsWith('./')) s = s.slice(2)
  s = s.replace(/\/+$/, '')
  return s
}

/** Parse the whole pasted text into a Plan. */
export function parseInput (text: string): Plan {
  const warnings: string[] = []
  const lines = text.replace(/\r\n?/g, '\n').split('\n')

  const contentsIdx = lines.findIndex(l => CONTENTS_HEADING.test(l))
  const structLines = contentsIdx >= 0 ? lines.slice(0, contentsIdx) : lines
  const contentLines = contentsIdx >= 0 ? lines.slice(contentsIdx + 1) : []

  const treeLines = extractTreeLines(structLines)
  const { root, entries } = parseTree(treeLines, warnings)

  const contents = parseContents(contentLines, warnings)

  const byPath = new Map<string, PlanEntry>()
  for (const e of entries) byPath.set(e.path, e)

  for (const [rawPath, content] of contents) {
    let p = normalizeRel(rawPath)
    if (root && p.startsWith(root + '/')) p = p.slice(root.length + 1)
    if (!p) continue
    const existing = byPath.get(p)
    if (existing) {
      if (existing.type === 'file') existing.content = content
    } else {
      const entry: PlanEntry = { path: p, type: 'file', content }
      entries.push(entry)
      byPath.set(p, entry)
      if (entries.length > 0 && treeLines.length > 0) {
        warnings.push(`"${p}" ada di File Contents tetapi tidak ada di struktur; ditambahkan.`)
      }
    }
  }

  return { root, entries, warnings }
}

/** Take lines from the first fenced block of the structure part, or all non-heading lines. */
function extractTreeLines (lines: string[]): string[] {
  const start = lines.findIndex(l => FENCE.test(l))
  if (start >= 0) {
    const open = FENCE.exec(lines[start])!
    const char = open[2][0]
    const len = open[2].length
    const out: string[] = []
    for (let i = start + 1; i < lines.length; i++) {
      const m = FENCE.exec(lines[i])
      if (m && m[2][0] === char && m[2].length >= len && m[3].trim() === '') break
      out.push(lines[i])
    }
    return out
  }
  return lines.filter(l => !ANY_HEADING.test(l))
}

function parseTree (lines: string[], warnings: string[]): { root: string | null, entries: PlanEntry[] } {
  let raws: RawLine[] = []
  for (const original of lines) {
    if (!original.trim()) continue
    const line = original.replace(/\t/g, '    ')
    const m = TREE_PREFIX.exec(line)!
    const col = m[0].length
    let name = line.slice(col)
    name = name.replace(/\s+(?:#|\/\/|<--|<-|←).*$/, '').trim()
    name = name.replace(/^`+|`+$/g, '').trim()
    if (!name || /^(\.{3}|…|⋯)$/.test(name)) continue
    raws.push({
      col,
      connector: !!m[2],
      name,
      explicitDir: /[\\/]$/.test(name)
    })
  }

  // Reject text that clearly is not a project structure (e.g. a copied shell command).
  const flat = raws.every(r => !r.connector && !r.explicitDir && r.col === raws[0].col)
  raws = raws.filter(r => {
    const commandLike = COMMAND_LIKE.test(r.name)
    const spacedNoExt = flat && /\s/.test(r.name) && !/\.[A-Za-z0-9]+$/.test(r.name)
    if (commandLike || spacedNoExt) {
      warnings.push(`Baris diabaikan karena terlihat seperti perintah, bukan nama file: "${r.name}"`)
      return false
    }
    return true
  })

  const hasChild = (i: number): boolean => i + 1 < raws.length && raws[i + 1].col > raws[i].col

  let root: string | null = null
  let skipFirst = false
  if (raws.length > 0) {
    const first = raws[0]
    const othersIndented = raws.slice(1).every(r => r.col > 0)
    if (!first.connector && first.col === 0 && othersIndented && (first.explicitDir || hasChild(0))) {
      const n = normalizeRel(first.name)
      root = n === '.' || n === '' ? null : n
      skipFirst = true
    }
  }

  const entries: PlanEntry[] = []
  const seen = new Map<string, PlanEntry>()
  const stack: { col: number, path: string }[] = []

  raws.forEach((r, i) => {
    if (skipFirst && i === 0) return
    while (stack.length && stack[stack.length - 1].col >= r.col) stack.pop()
    const parent = stack.length ? stack[stack.length - 1].path : ''
    const rel = normalizeRel(parent ? `${parent}/${r.name}` : r.name)
    if (!rel) return
    const type: 'dir' | 'file' = r.explicitDir || hasChild(i) ? 'dir' : 'file'
    stack.push({ col: r.col, path: rel })
    const prev = seen.get(rel)
    if (prev) {
      if (type === 'dir') prev.type = 'dir'
      return
    }
    const entry: PlanEntry = { path: rel, type }
    seen.set(rel, entry)
    entries.push(entry)
  })

  return { root, entries }
}

function cleanHeadingPath (raw: string): string | null {
  let s = raw.trim()
  s = s.replace(/\s+#+\s*$/, '')
  s = s.replace(/^(?:file|path|berkas)\s*:\s*/i, '')
  s = s.replace(/^[*_`"']+|[*_`"':]+$/g, '').trim()
  if (!s) return null
  const base = s.split('/').pop() ?? s
  const looksLikePath =
    s.includes('/') ||
    /\.[A-Za-z0-9_-]+$/.test(base) ||
    base.startsWith('.') ||
    NO_EXT_NAMES.has(base.toLowerCase())
  return looksLikePath ? s : null
}

function parseContents (lines: string[], warnings: string[]): Map<string, string> {
  const result = new Map<string, string>()
  let i = 0
  while (i < lines.length) {
    const h = /^\s{0,3}#{1,6}\s+(.+?)\s*$/.exec(lines[i])
    if (!h) { i++; continue }
    const path = cleanHeadingPath(h[1])
    if (!path) { i++; continue }

    let j = i + 1
    while (j < lines.length && !FENCE.test(lines[j]) && !ANY_HEADING.test(lines[j])) j++
    if (j >= lines.length || !FENCE.test(lines[j])) {
      warnings.push(`"${path}" tidak punya blok kode; dibuat kosong.`)
      i = j
      continue
    }

    const open = FENCE.exec(lines[j])!
    const indent = open[1].length
    const char = open[2][0]
    const len = open[2].length
    const body: string[] = []
    let depth = 0
    let k = j + 1
    for (; k < lines.length; k++) {
      const m = FENCE.exec(lines[k])
      if (m && m[2][0] === char && m[2].length >= len) {
        if (m[3].trim() === '') {
          if (depth > 0) depth--
          else break
        } else {
          depth++
        }
      }
      body.push(indent > 0 ? lines[k].replace(new RegExp(`^ {0,${indent}}`), '') : lines[k])
    }
    result.set(path, body.join('\n'))
    i = k + 1
  }
  return result
}
