import * as vscode from 'vscode'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parseInput } from '../../src/parser'
import { applyPlan, resolveBase } from '../../src/writer'
import type { Result } from '../../src/writer'

const output = vscode.window.createOutputChannel('TreePaste')

function describe (r: Result, dry: boolean): string {
  const w = dry ? 'akan ' : ''
  const tag: Record<Result['action'], string> = {
    created: `+ ${w}dibuat`,
    filled: `~ ${w}diisi`,
    overwritten: `! ${w}ditimpa`,
    'dir-created': `+ ${w}folder`,
    'dir-exists': '= folder ada',
    'skipped-exists': '= dilewati (sudah ada)',
    'skipped-binary': '- biner (buat manual)',
    error: 'x gagal'
  }
  return `${tag[r.action]}  ${r.path}${r.note ? `  (${r.note})` : ''}`
}

function count (results: Result[], ...actions: Result['action'][]): number {
  return results.filter(r => actions.includes(r.action)).length
}

async function pickTarget (uri?: vscode.Uri): Promise<string | undefined> {
  if (uri) {
    try {
      return fs.statSync(uri.fsPath).isDirectory() ? uri.fsPath : path.dirname(uri.fsPath)
    } catch { /* fall through to workspace folders */ }
  }
  const folders = vscode.workspace.workspaceFolders
  if (!folders || folders.length === 0) {
    void vscode.window.showErrorMessage('TreePaste: buka sebuah folder di VS Code terlebih dahulu.')
    return undefined
  }
  if (folders.length === 1) return folders[0].uri.fsPath
  const picked = await vscode.window.showWorkspaceFolderPick({
    placeHolder: 'Pilih folder tujuan untuk struktur proyek'
  })
  return picked?.uri.fsPath
}

async function run (mode: 'preview' | 'create', uri?: vscode.Uri): Promise<void> {
  const text = await vscode.env.clipboard.readText()
  if (!text.trim()) {
    void vscode.window.showWarningMessage('TreePaste: clipboard kosong. Salin struktur proyek terlebih dahulu.')
    return
  }

  const plan = parseInput(text)
  if (plan.entries.length === 0) {
    void vscode.window.showWarningMessage('TreePaste: struktur proyek tidak ditemukan di clipboard. Pastikan yang disalin adalah struktur (pohon direktori), bukan perintahnya.')
    return
  }

  const cwd = await pickTarget(uri)
  if (!cwd) return

  const cfg = vscode.workspace.getConfiguration('treepaste')
  const noRoot = cfg.get<boolean>('noRoot', false)
  const confirm = cfg.get<boolean>('confirmBeforeCreate', true)
  const target = resolveBase(plan, { cwd, noRoot })

  // Dry-run first: shows exactly what would happen.
  const preview = applyPlan(plan, { cwd, noRoot, dryRun: true })

  if (mode === 'preview') {
    output.clear()
    output.appendLine(`[pratinjau] Tujuan: ${target}`)
    for (const w of plan.warnings) output.appendLine(`peringatan: ${w}`)
    for (const r of preview) output.appendLine('  ' + describe(r, true))
    output.show(true)
    return
  }

  const toCreate = count(preview, 'created', 'filled', 'dir-created')
  const skipped = count(preview, 'skipped-exists')
  const binary = count(preview, 'skipped-binary')
  const errors = count(preview, 'error')

  if (toCreate === 0) {
    void vscode.window.showInformationMessage(
      `TreePaste: tidak ada yang perlu dibuat (${skipped} sudah ada, ${binary} biner dilewati).`
    )
    return
  }

  if (confirm) {
    const choice = await vscode.window.showInformationMessage(
      `Buat ${toCreate} item di ${target}? ${skipped} file yang sudah ada akan dilewati, ` +
      `${binary} file biner dilewati${errors ? `, ${errors} ditolak` : ''}.`,
      { modal: true },
      'Buat',
      'Lihat pratinjau'
    )
    if (choice === 'Lihat pratinjau') {
      await run('preview', uri)
      return
    }
    if (choice !== 'Buat') return
  }

  const results = applyPlan(plan, { cwd, noRoot })
  output.clear()
  output.appendLine(`Tujuan: ${target}`)
  for (const w of plan.warnings) output.appendLine(`peringatan: ${w}`)
  for (const r of results) output.appendLine('  ' + describe(r, false))

  const made = count(results, 'created', 'filled', 'dir-created')
  const failed = count(results, 'error')
  const msg =
    `TreePaste: ${made} item dibuat, ${count(results, 'skipped-exists')} dilewati (sudah ada), ` +
    `${count(results, 'skipped-binary')} biner dilewati${failed ? `, ${failed} gagal` : ''}.`
  const detail = 'Lihat detail'
  const action = failed
    ? await vscode.window.showWarningMessage(msg, detail)
    : await vscode.window.showInformationMessage(msg, detail)
  if (action === detail) output.show(true)
}

export function activate (context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    output,
    vscode.commands.registerCommand('treepaste.fromClipboard', (uri?: vscode.Uri) => run('create', uri)),
    vscode.commands.registerCommand('treepaste.previewFromClipboard', (uri?: vscode.Uri) => run('preview', uri))
  )
}

export function deactivate (): void {}
