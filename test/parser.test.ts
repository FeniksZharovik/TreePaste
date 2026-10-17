import { test } from 'node:test'
import * as assert from 'node:assert/strict'
import { parseInput } from '../src/parser'

const DEMO = `demo-app/
├── package.json         # konfigurasi
├── index.js             # titik masuk
├── index.html
├── assets/
│   ├── logo.png
│   └── banner.png
├── docs/
│   └── NOTES.md         # catatan
├── README.md
├── LICENSE              # MIT
└── .gitignore
`

test('parses root, nested dirs, and strips comments', () => {
  const plan = parseInput(DEMO)
  assert.equal(plan.root, 'demo-app')
  const paths = plan.entries.map(e => `${e.type}:${e.path}`)
  assert.deepEqual(paths, [
    'file:package.json', 'file:index.js', 'file:index.html',
    'dir:assets', 'file:assets/logo.png', 'file:assets/banner.png',
    'dir:docs', 'file:docs/NOTES.md',
    'file:README.md', 'file:LICENSE', 'file:.gitignore'
  ])
})

const SAMPLE = `# Project Structure

\`\`\`
sample-app/
└── src
    └── hello.js
\`\`\`

# File Contents
## src/hello.js

\`\`\`
const name = 'dunia'
console.log(\`halo, \${name}\`) // # bukan heading
\`\`\`
`

test('parses File Contents and fills the matching file', () => {
  const plan = parseInput(SAMPLE)
  assert.equal(plan.root, 'sample-app')
  const dir = plan.entries.find(e => e.path === 'src')
  assert.equal(dir?.type, 'dir')
  const file = plan.entries.find(e => e.path === 'src/hello.js')
  assert.equal(file?.type, 'file')
  assert.ok(file?.content?.includes("const name = 'dunia'"))
  assert.ok(file?.content?.includes('console.log('))
  assert.equal(plan.entries.length, 2)
})

test('content path may include the root folder prefix', () => {
  const plan = parseInput('# Project Structure\n```\nproj/\n└── a.txt\n```\n# File Contents\n## proj/a.txt\n```\nhi\n```\n')
  assert.equal(plan.entries.length, 1)
  assert.equal(plan.entries[0].content, 'hi')
})

test('four-backtick fence keeps nested code fences inside the file', () => {
  const text = [
    '# Project Structure', '```', 'p/', '└── README.md', '```',
    '# File Contents', '## README.md', '````markdown',
    '# Title', '```bash', 'npm i', '```', 'end', '````'
  ].join('\n')
  const plan = parseInput(text)
  assert.equal(plan.entries[0].content, '# Title\n```bash\nnpm i\n```\nend')
})

test('nested fence with info string inside a 3-backtick block is handled', () => {
  const text = [
    '# Project Structure', '```', 'p/', '├── README.md', '└── b.txt', '```',
    '# File Contents', '## README.md', '```markdown',
    '# T', '```bash', 'npm i', '```', 'x', '```', '## b.txt', '```', 'B', '```'
  ].join('\n')
  const plan = parseInput(text)
  assert.equal(plan.entries.find(e => e.path === 'README.md')?.content, '# T\n```bash\nnpm i\n```\nx')
  assert.equal(plan.entries.find(e => e.path === 'b.txt')?.content, 'B')
})

test('works without a root line and with plain indentation', () => {
  const plan = parseInput('src/\n  index.ts\n  util/\n    a.ts\nREADME.md')
  assert.equal(plan.root, null)
  assert.deepEqual(plan.entries.map(e => e.path), ['src', 'src/index.ts', 'src/util', 'src/util/a.ts', 'README.md'])
})

test('supports ASCII connectors and CRLF', () => {
  const plan = parseInput('proj/\r\n|-- src\r\n|   `-- main.go\r\n`-- go.mod\r\n')
  assert.equal(plan.root, 'proj')
  assert.deepEqual(plan.entries.map(e => e.path), ['src', 'src/main.go', 'go.mod'])
})

test('content-only headings add files that are missing from the tree', () => {
  const plan = parseInput('# Project Structure\n```\nr/\n└── a.txt\n```\n# File Contents\n## b/c.txt\n```\nX\n```\n')
  assert.ok(plan.entries.some(e => e.path === 'b/c.txt' && e.content === 'X'))
  assert.equal(plan.warnings.length, 1)
})
