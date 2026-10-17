# TreePaste untuk VS Code

Tempel struktur proyek dari clipboard, jadilah file dan folder.

## Cara pakai

1. Salin struktur proyek (pohon `├── └── │`, boleh disertai bagian `# File Contents`).
2. Buka Command Palette (`Ctrl+Shift+P`) lalu pilih **TreePaste: Buat struktur dari clipboard**.
3. Atau klik kanan sebuah folder di Explorer, lalu pilih **Buat struktur dari clipboard**.

Contoh yang bisa ditempel:

````text
demo-app/
├── package.json
├── src/
│   └── index.js
└── README.md
````

## Aturan

- File yang sudah ada **dilewati**, tidak pernah ditimpa.
- File biner (gambar, ikon, PDF, font) dilewati; buat manual.
- Path di luar folder tujuan ditolak.
- Jika folder tujuan sudah bernama sama dengan root, file ditulis langsung ke sana.

## Perintah

| Perintah | Fungsi |
|----------|--------|
| TreePaste: Buat struktur dari clipboard | Membuat file dan folder (dengan konfirmasi) |
| TreePaste: Pratinjau struktur dari clipboard (dry-run) | Menampilkan rencana di panel Output tanpa menulis |

## Pengaturan

| Pengaturan | Default | Fungsi |
|------------|---------|--------|
| `treepaste.noRoot` | `false` | Tulis langsung ke folder tujuan, tanpa folder root |
| `treepaste.confirmBeforeCreate` | `true` | Minta konfirmasi sebelum menulis |

Versi CLI tersedia di repo yang sama (`treepaste`).

## Lisensi

MIT
