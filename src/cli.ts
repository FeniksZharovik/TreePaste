#!/usr/bin/env node
import * as fs from 'node:fs'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'
import { parseInput } from './parser'
import { applyPlan, resolveBase } from './writer'
import type { Result } from './writer'

const VERSION = '0.1.1'

const HELP = `TreePaste ${VERSION}
Tempel struktur proyek, jadilah file dan folder.

Pemakaian:
  treepaste [opsi] [berkas]

  Tanpa argumen, TreePaste membaca dari stdin. Di terminal interaktif, tempel
  teks lalu tekan Ctrl+D (Windows: Ctrl+Z lalu Enter).

Opsi:
  -c, --clipboard     Baca teks dari clipboard
  -C, --cwd <folder>  Folder tujuan (default: folder saat ini)
  -n, --dry-run       Tampilkan rencana tanpa menulis apa pun
      --no-root       Jangan buat folder root dari baris pertama
  -f, --force         Timpa file yang sudah ada (default: dilewati)
  -h, --help          Tampilkan bantuan
  -v, --version       Tampilkan versi

Contoh:
  Get-Clipboard | treepaste        (PowerShell)
  pbpaste | treepaste              (macOS)
  treepaste --clipboard --dry-run
  treepaste struktur.md
`

interface Args {
  clipboard: boolean
  cwd: string
  dryRun: boolean
  noRoot: boolean
  force: boolean
  help: boolean
  version: boolean
  file?: string
}

function parseArgs (argv: string[]): Args {
  const a: Args = {
    clipboard: false, cwd: process.cwd(), dryRun: false,
    noRoot: false, force: false, help: false, version: false
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    switch (arg) {
      case '-c': case '--clipboard': a.clipboard = true; break
      case '-n': case '--dry-run': a.dryRun = true; break
      case '--no-root': a.noRoot = true; break
      case '-f': case '--force': a.force = true; break
      case '-h': case '--help': a.help = true; break
      case '-v': case '--version': a.version = true; break
      case '-C': case '--cwd': {
        const v = argv[++i]
        if (!v) throw new Error(`${arg} membutuhkan nilai folder`)
        a.cwd = path.resolve(v)
        break
      }
      default:
        if (arg.startsWith('-')) throw new Error(`Opsi tidak dikenal: ${arg}`)
        if (a.file) throw new Error('Hanya satu berkas input yang diperbolehkan')
        a.file = arg
    }
  }
  return a
}

function readClipboard (): string {
  const candidates: [string, string[]][] =
    process.platform === 'win32'
      ? [['powershell', ['-NoProfile', '-Command', 'Get-Clipboard -Raw']]]
      : process.platform === 'darwin'
        ? [['pbpaste', []]]
        : [
            ['wl-paste', ['--no-newline']],
            ['xclip', ['-selection', 'clipboard', '-o']],
            ['xsel', ['--clipboard', '--output']]
          ]
  for (const [cmd, args] of candidates) {
    const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    if (!r.error && r.status === 0) return r.stdout
  }
  throw new Error('Tidak bisa membaca clipboard. Gunakan pipe: pbpaste | treepaste')
}

function readStdin (): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    process.stdin.on('data', c => chunks.push(Buffer.from(c)))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    process.stdin.on('error', reject)
  })
}

const useColor = process.stdout.isTTY && !process.env.NO_COLOR
const paint = (code: number, s: string): string => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s)

function label (r: Result, dry: boolean): string {
  const w = dry ? 'akan ' : ''
  const pad = (t: string): string => t.padEnd(16)
  switch (r.action) {
    case 'created': return paint(32, pad(`+ ${w}dibuat`))
    case 'filled': return paint(32, pad(`~ ${w}diisi`))
    case 'overwritten': return paint(33, pad(`! ${w}ditimpa`))
    case 'dir-created': return paint(32, pad(`+ ${w}folder`))
    case 'dir-exists': return paint(90, pad('= folder ada'))
    case 'skipped-exists': return paint(90, pad('= dilewati'))
    case 'skipped-binary': return paint(33, pad('- biner'))
    default: return paint(31, pad('x gagal'))
  }
}

async function main (): Promise<number> {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) { process.stdout.write(HELP); return 0 }
  if (args.version) { process.stdout.write(VERSION + '\n'); return 0 }

  let text: string
  if (args.clipboard) {
    text = readClipboard()
  } else if (args.file) {
    text = fs.readFileSync(args.file, 'utf8')
  } else {
    if (process.stdin.isTTY) {
      process.stderr.write(
        'Tempel struktur proyek di bawah ini, lalu tekan Ctrl+D ' +
        '(Windows: Ctrl+Z lalu Enter):\n'
      )
      process.stdin.setEncoding('utf8')
    }
    text = await readStdin()
  }

  if (!text.trim()) {
    process.stderr.write('Tidak ada input. Jalankan treepaste --help untuk bantuan.\n')
    return 2
  }

  const plan = parseInput(text)
  if (plan.entries.length === 0) {
    process.stderr.write(
      'Struktur proyek tidak ditemukan pada teks yang dibaca.\n' +
      'Pastikan yang disalin adalah struktur (pohon direktori), bukan perintahnya.\n'
    )
    for (const w of plan.warnings) process.stderr.write(paint(33, `peringatan: ${w}`) + '\n')
    return 2
  }

  for (const w of plan.warnings) process.stderr.write(paint(33, `peringatan: ${w}`) + '\n')

  const opts = { cwd: args.cwd, dryRun: args.dryRun, force: args.force, noRoot: args.noRoot }
  const target = resolveBase(plan, opts)
  process.stdout.write(
    `${args.dryRun ? '[dry-run] ' : ''}Tujuan: ${target}\n\n`
  )

  const results = applyPlan(plan, opts)
  for (const r of results) {
    process.stdout.write(`  ${label(r, args.dryRun)}${r.path}${r.note ? paint(90, `  (${r.note})`) : ''}\n`)
  }

  const count = (...a: Result['action'][]): number => results.filter(r => a.includes(r.action)).length
  const errors = count('error')
  process.stdout.write(
    `\nRingkasan: ${count('created')} dibuat, ${count('filled')} diisi, ` +
    `${count('overwritten')} ditimpa, ${count('skipped-exists')} dilewati (sudah ada), ` +
    `${count('skipped-binary')} dilewati (biner), ${errors} gagal.\n`
  )
  return errors > 0 ? 1 : 0
}

main().then(code => { process.exitCode = code }).catch(err => {
  process.stderr.write(`Error: ${(err as Error).message}\n`)
  process.exitCode = 2
})
