import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { parseInput } from '../src/parser'
import { applyPlan, isBinaryPath, validateRel } from '../src/writer'

function tmp (): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'treepaste-'))
}

const INPUT = `proj/
├── a.txt
├── icons/
│   └── logo.png
└── src/
    └── main.ts
`

test('creates empty files, skips binary, creates root folder', () => {
  const cwd = tmp()
  const results = applyPlan(parseInput(INPUT), { cwd })
  assert.ok(fs.existsSync(path.join(cwd, 'proj', 'a.txt')))
  assert.equal(fs.readFileSync(path.join(cwd, 'proj', 'a.txt'), 'utf8'), '')
  assert.ok(fs.existsSync(path.join(cwd, 'proj', 'src', 'main.ts')))
  assert.ok(!fs.existsSync(path.join(cwd, 'proj', 'icons', 'logo.png')))
  assert.ok(results.some(r => r.path === 'icons/logo.png' && r.action === 'skipped-binary'))
})

test('does not nest when cwd already has the root name', () => {
  const parent = tmp()
  const cwd = path.join(parent, 'proj')
  fs.mkdirSync(cwd)
  applyPlan(parseInput(INPUT), { cwd })
  assert.ok(fs.existsSync(path.join(cwd, 'a.txt')))
  assert.ok(!fs.existsSync(path.join(cwd, 'proj')))
})

test('--no-root writes directly into cwd', () => {
  const cwd = tmp()
  applyPlan(parseInput(INPUT), { cwd, noRoot: true })
  assert.ok(fs.existsSync(path.join(cwd, 'a.txt')))
})

test('existing files are skipped and never overwritten', () => {
  const cwd = tmp()
  fs.mkdirSync(path.join(cwd, 'proj'))
  fs.writeFileSync(path.join(cwd, 'proj', 'a.txt'), 'KEEP')
  const plan = parseInput(INPUT + '\n# File Contents\n## a.txt\n```\nNEW\n```\n')
  const results = applyPlan(plan, { cwd })
  assert.equal(fs.readFileSync(path.join(cwd, 'proj', 'a.txt'), 'utf8'), 'KEEP')
  assert.ok(results.some(r => r.path === 'a.txt' && r.action === 'skipped-exists'))
})

test('--force overwrites existing files', () => {
  const cwd = tmp()
  fs.mkdirSync(path.join(cwd, 'proj'))
  fs.writeFileSync(path.join(cwd, 'proj', 'a.txt'), 'OLD')
  const plan = parseInput(INPUT + '\n# File Contents\n## a.txt\n```\nNEW\n```\n')
  applyPlan(plan, { cwd, force: true })
  assert.equal(fs.readFileSync(path.join(cwd, 'proj', 'a.txt'), 'utf8'), 'NEW\n')
})

test('file contents are written when provided', () => {
  const cwd = tmp()
  const plan = parseInput('p/\n└── src\n    └── main.js\n\n# File Contents\n## src/main.js\n```\nconst a = 1\n```\n')
  const results = applyPlan(plan, { cwd })
  assert.equal(fs.readFileSync(path.join(cwd, 'p', 'src', 'main.js'), 'utf8'), 'const a = 1\n')
  assert.ok(results.some(r => r.action === 'filled'))
})

test('dry-run writes nothing', () => {
  const cwd = tmp()
  const results = applyPlan(parseInput(INPUT), { cwd, dryRun: true })
  assert.deepEqual(fs.readdirSync(cwd), [])
  assert.ok(results.length > 0)
})

test('path traversal and absolute paths are rejected', () => {
  const cwd = tmp()
  const results = applyPlan(
    { root: null, warnings: [], entries: [
      { path: '../evil.txt', type: 'file' },
      { path: '/etc/evil.txt', type: 'file' },
      { path: 'ok/../../evil2.txt', type: 'file' }
    ] },
    { cwd }
  )
  assert.ok(results.every(r => r.action === 'error'))
  assert.ok(!fs.existsSync(path.join(path.dirname(cwd), 'evil.txt')))
})

test('helpers', () => {
  assert.equal(isBinaryPath('assets/logo.PNG'), true)
  assert.equal(isBinaryPath('icon.svg'), false)
  assert.equal(isBinaryPath('LICENSE'), false)
  assert.ok(validateRel('..'))
  assert.equal(validateRel('a/b.txt'), null)
})
