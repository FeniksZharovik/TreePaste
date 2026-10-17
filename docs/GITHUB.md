# Panduan Repo GitHub: TreePaste

## Nama repo
`treepaste`

## Description (About)
CLI untuk membuat struktur proyek otomatis dari teks tempelan (tree + isi file). File yang sudah ada dilewati, aman dipakai berulang.

## Topics
`cli`, `scaffolding`, `project-structure`, `vscode`, `typescript`, `nodejs`, `developer-tools`, `llm`, `productivity`

## Langkah publish

```bash
git init
git add .
git commit -m "feat: rilis awal TreePaste v0.1.0"
git branch -M main
git remote add origin https://github.com/<username>/treepaste.git
git push -u origin main
```

Lalu di GitHub: isi **Description** dan **Topics** di kolom About (ikon roda gigi).

## Rilis v0.1.0

```bash
git tag v0.1.0
git push origin v0.1.0
```

Buka **Releases > Draft a new release**, pilih tag `v0.1.0`, judul `TreePaste v0.1.0`, lalu tempel catatan di bawah.

### Catatan release

```markdown
## TreePaste v0.1.0: rilis pertama

Tempel struktur proyek, langsung jadi file dan folder.

### Yang baru
- Parser pohon direktori (`├── └── │`, ASCII, dan indentasi) dengan dukungan komentar
- Pengisian isi file dari bagian `# File Contents` (`## path` + blok kode)
- File yang sudah ada otomatis dilewati
- File biner (gambar, ikon, PDF, font) dilewati
- Opsi `--clipboard`, `--dry-run`, `--cwd`, `--no-root`, `--force`
- Perlindungan path traversal dan symlink keluar folder kerja
- Tanpa dependensi runtime; Windows, macOS, Linux (Node.js 18+)

### Instalasi
npm install -g treepaste

### Catatan
Rilis awal. Ekstensi VS Code direncanakan untuk versi berikutnya.
Laporkan masalah lewat tab Issues.
```

## Publish ke npm (opsional)

```bash
npm login
npm publish
```

Cek dulu ketersediaan nama `treepaste` di npm. Jika sudah dipakai, ganti `name` di `package.json`
(mis. `@username/treepaste`) dan gunakan `npm publish --access public`.
