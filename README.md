# TreePaste

Tempel struktur proyek, jadilah file dan folder.

TreePaste membaca teks pohon direktori (seperti yang dihasilkan chat AI) dan langsung membuat
strukturnya di folder kerja Anda. Bila ada bagian `# File Contents`, file ikut diisi.
Aman dijalankan berulang: file yang sudah ada **tidak pernah ditimpa**.

## Fitur

- Membuat folder dan file kosong dari pohon `├── └── │` (juga format ASCII `|-- \`--` dan indentasi spasi)
- Mengisi file otomatis dari bagian `# File Contents` (`## path` + blok kode)
- Melewati file yang sudah ada (kecuali memakai `--force`)
- Melewati file biner (gambar, ikon, PDF, font, dll.); buat manual
- Mode `--dry-run` untuk pratinjau
- Perlindungan path traversal: `../`, path absolut, dan symlink keluar folder kerja ditolak
- Tanpa dependensi runtime; Windows, macOS, dan Linux (Node.js 18+)

## Instalasi

```bash
npm install -g treepaste
# atau tanpa instalasi
npx treepaste
```

## Penggunaan

Di terminal VS Code, salin struktur dari chat AI, lalu:

```bash
treepaste --clipboard          # baca langsung dari clipboard
```

Atau lewat pipe:

```bash
# Windows (PowerShell)
Get-Clipboard | treepaste

# macOS
pbpaste | treepaste

# Linux
xclip -selection clipboard -o | treepaste
```

Atau mode interaktif: jalankan `treepaste`, tempel teks, lalu tekan `Ctrl+D`
(Windows: `Ctrl+Z` lalu `Enter`). Bisa juga dari berkas: `treepaste struktur.md`.

### Contoh 1: hanya struktur

````text
demo-app/
├── package.json         # konfigurasi
├── index.js
├── assets/
│   └── logo.png
├── README.md
└── .gitignore
````

Hasil: `package.json`, `index.js`, `README.md`, dan `.gitignore` dibuat kosong.
`logo.png` dilewati karena file biner.

### Contoh 2: struktur beserta isi file

````text
# Project Structure

```
demo-app/
└── src
    └── hello.js
```

# File Contents
## src/hello.js

```
console.log('Halo dari TreePaste!')
```
````

Hasil: `src/hello.js` dibuat dan langsung berisi kode di atas.

> Jika isi file memuat blok kode sendiri (misalnya README), bungkus dengan pagar yang lebih
> panjang, mis. empat backtick, agar blok bagian dalamnya tidak memutus blok luar.

## Ekstensi VS Code

Tidak mau mengetik di terminal? Gunakan ekstensi di folder [`vscode/`](vscode). Salin struktur,
buka Command Palette, jalankan **TreePaste: Buat struktur dari clipboard**, periksa ringkasan, klik **Buat**.
Aturannya sama dengan CLI (file yang sudah ada dilewati, biner dilewati, path berbahaya ditolak).

Pasang dari berkas `.vsix`:

```bash
code --install-extension treepaste-vscode-0.1.0.vsix
```

Atau bangun sendiri:

```bash
cd vscode
npm install
npm run package     # menghasilkan treepaste-vscode-<versi>.vsix
```

## Ekstensi VS Code

Tidak mau mengetik di terminal? Pasang ekstensi dari folder `extension/`
(atau unduh berkas `.vsix` dari halaman Releases):

1. Buka VS Code, tekan `Ctrl+Shift+X`, klik menu `...` di kanan atas panel Extensions,
   pilih **Install from VSIX...**, lalu pilih `treepaste-vscode-0.1.0.vsix`.
   (Atau lewat terminal: `code --install-extension treepaste-vscode-0.1.0.vsix`)
2. Salin struktur proyek, tekan `Ctrl+Shift+P`, lalu pilih **TreePaste: Buat struktur dari clipboard**.
   Atau klik kanan sebuah folder di Explorer.
3. Gunakan **TreePaste: Pratinjau struktur dari clipboard (dry-run)** untuk melihat rencana tanpa menulis.

Ekstensi memakai parser dan writer yang sama dengan CLI, jadi aturannya identik
(file yang ada dilewati, biner dilewati, path berbahaya ditolak).

Membuat `.vsix` sendiri:

```bash
cd extension
npm install
npm run package
```

## Opsi

| Opsi | Fungsi |
|------|--------|
| `-c`, `--clipboard` | Baca teks dari clipboard |
| `-C`, `--cwd <folder>` | Folder tujuan (default: folder saat ini) |
| `-n`, `--dry-run` | Tampilkan rencana tanpa menulis apa pun |
| `--no-root` | Jangan buat folder root dari baris pertama |
| `-f`, `--force` | Timpa file yang sudah ada |
| `-h`, `--help` | Bantuan |
| `-v`, `--version` | Versi |

## Aturan

1. **Folder root**: baris pertama seperti `proyek/` dianggap folder root. Jika folder kerja Anda
   sudah bernama sama, file ditulis langsung ke sana (tidak dibuat `proyek/proyek/`).
   Gunakan `--no-root` untuk selalu menulis langsung ke folder kerja.
2. **File yang sudah ada dilewati**, termasuk saat ada isinya di `File Contents`. Gunakan `--force`
   bila memang ingin menimpa.
3. **File biner dilewati**: `png jpg gif webp ico pdf zip ttf woff mp3 mp4` dan sejenisnya.
   `svg` dianggap teks sehingga tetap dibuat.
4. **Komentar** setelah `#` atau `//` pada baris pohon diabaikan.
5. **Path di luar folder kerja ditolak**.
6. Kode keluar: `0` berhasil, `1` ada file gagal dibuat, `2` input tidak valid.

## Pemakaian sebagai library

```ts
import { parseInput, applyPlan } from 'treepaste'

const plan = parseInput(text)
const results = applyPlan(plan, { cwd: process.cwd(), dryRun: true })
```

## Pengembangan

```bash
git clone https://github.com/<username>/treepaste
cd treepaste
npm install
npm test        # build + jalankan tes
npm run build
node dist/src/cli.js --help
```

Struktur kode:

```
src/parser.ts   teks -> rencana (tree + File Contents)
src/writer.ts   rencana -> file (skip, biner, penjaga path)
src/cli.ts      antarmuka baris perintah
src/index.ts    API library
vscode/         ekstensi VS Code (memakai src/ sebagai core)
test/           tes parser dan writer (node:test)
```

## Peta jalan

- [x] Ekstensi VS Code (command "Buat struktur dari clipboard") yang memakai core yang sama
- [ ] Publikasi ekstensi ke VS Code Marketplace
- [ ] Dukungan daftar markdown (`- folder/`) sebagai input
- [ ] Berkas konfigurasi `.treepasterc`

## Lisensi

MIT
