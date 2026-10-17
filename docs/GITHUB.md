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
Pada bagian **Attach binaries**, unggah `extension/treepaste-vscode-0.1.0.vsix` (hasil `npm run package` di folder `extension`).

### Catatan release

```markdown
## TreePaste v0.1.0: rilis pertama

Tempel struktur proyek, langsung jadi file dan folder.

### Yang baru
- Ekstensi VS Code (`treepaste-vscode-0.1.0.vsix`): perintah "Buat struktur dari clipboard" dan "Pratinjau (dry-run)", plus menu klik kanan pada folder
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

## Ekstensi VS Code

Ekstensi ada di folder `vscode/` dan memakai core yang sama dengan CLI.

```bash
cd vscode
npm install
npm run package
```

Perintah di atas menghasilkan `treepaste-vscode-0.1.0.vsix`. Lampirkan berkas itu pada halaman release
agar pengguna bisa memasangnya dengan `code --install-extension treepaste-vscode-0.1.0.vsix`.

Sebelum membagikan ke publik, ganti `publisher` di `vscode/package.json` dengan nama publisher Anda
(dan tambahkan field `repository`). Untuk Marketplace: buat publisher di https://marketplace.visualstudio.com/manage,
lalu `npx @vscode/vsce publish`.

### Catatan release ekstensi

```markdown
## TreePaste untuk VS Code v0.1.0

Tempel struktur proyek dari clipboard, langsung jadi file dan folder, tanpa terminal.

### Yang baru
- Perintah **TreePaste: Buat struktur dari clipboard**
- Perintah **TreePaste: Pratinjau struktur dari clipboard (dry-run)**
- Perintah **TreePaste: Buat struktur dari teks terpilih** (juga di menu klik kanan)
- Ringkasan dan konfirmasi sebelum file dibuat (`treepaste.confirmBeforeCreate`)
- Opsi `treepaste.noRoot` untuk menulis langsung ke folder workspace
- File yang sudah ada tidak ditimpa; file biner dilewati; path di luar workspace ditolak

### Pemasangan
code --install-extension treepaste-vscode-0.1.0.vsix
```

## Publish ekstensi ke Marketplace (opsional)

1. Buat publisher di <https://marketplace.visualstudio.com/manage> dan ganti `publisher` di `extension/package.json`.
2. Tambahkan `repository` (URL repo GitHub) di `extension/package.json`.
3. Buat Personal Access Token (scope Marketplace > Manage), lalu:

```bash
cd extension
npx vsce login <publisher>
npx vsce publish
```

Untuk Open VSX (VSCodium dan sejenisnya): `npx ovsx publish treepaste-vscode-0.1.0.vsix -p <token>`.
