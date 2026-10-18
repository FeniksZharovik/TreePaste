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
git commit -m "fix: tolak teks perintah di clipboard (v0.1.1)"
git branch -M main
git remote add origin https://github.com/<username>/treepaste.git
git push -u origin main
```

Lalu di GitHub: isi **Description** dan **Topics** di kolom About (ikon roda gigi).

## Rilis v0.1.1

```bash
git tag v0.1.1
git push origin v0.1.1
```

Buka **Releases > Draft a new release**, pilih tag `v0.1.1`, judul `TreePaste v0.1.1`, lalu tempel catatan di bawah.
Pada bagian **Attach binaries**, unggah `extension/treepaste-vscode-0.1.1.vsix` (hasil `npm run package` di folder `extension`).

### Catatan release v0.1.1

```markdown
## TreePaste v0.1.1: perbaikan input clipboard

Rilis perbaikan untuk `treepaste --clipboard` dan ekstensi VS Code.

### Diperbaiki
- Teks perintah yang tidak sengaja tersalin (mis. `treepaste --clipboard`, `npm install`)
  tidak lagi dibuat menjadi file tanpa ekstensi. Teks seperti itu sekarang diabaikan
  dengan peringatan, dan CLI keluar dengan kode 2 jika tidak ada struktur yang valid.
- Baris perintah yang terselip di atas struktur asli dilewati; strukturnya tetap dibuat.
- Pesan galat lebih jelas: "pastikan yang disalin adalah struktur, bukan perintahnya".

### Berubah
- Publisher ekstensi VS Code diganti menjadi `FeniksZharovik`. ID ekstensi kini
  `FeniksZharovik.treepaste-vscode`, jadi versi lama (`adimastha.treepaste-vscode`) harus dihapus dulu.

### Tidak berubah
- Daftar file biasa (`README.md`, `LICENSE`, `My Notes.txt`) tetap berfungsi.
- File yang sudah ada tetap dilewati; file biner tetap dilewati.

### Pembaruan
- CLI: `npm install -g treepaste@latest`
- Ekstensi VS Code: unduh `treepaste-vscode-0.1.1.vsix` di bawah, lalu
  `code --uninstall-extension adimastha.treepaste-vscode` (hanya jika sebelumnya terpasang),
  `code --install-extension treepaste-vscode-0.1.1.vsix --force`, dan muat ulang jendela VS Code.

Tes: 20 tes otomatis lulus (3 tes baru).
```

### Catatan release v0.1.0 (riwayat)

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
Rilis awal. Laporkan masalah lewat tab Issues.
```

## Publish ke npm (opsional)

```bash
npm login
npm publish
```

Cek dulu ketersediaan nama `treepaste` di npm. Jika sudah dipakai, ganti `name` di `package.json`
(mis. `@username/treepaste`) dan gunakan `npm publish --access public`.

## Publish ekstensi ke Marketplace (opsional)

1. Buat publisher dengan ID `FeniksZharovik` di <https://marketplace.visualstudio.com/manage> (harus sama persis dengan `publisher` di `extension/package.json`).
2. Tambahkan `repository` (URL repo GitHub) di `extension/package.json`.
3. Buat Personal Access Token (scope Marketplace > Manage), lalu:

```bash
cd extension
npx vsce login FeniksZharovik
npx vsce publish
```

Untuk Open VSX (VSCodium dan sejenisnya): `npx ovsx publish treepaste-vscode-0.1.1.vsix -p <token>`.
