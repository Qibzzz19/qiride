# Qiride — Smart Motorcycle Care

PWA *mobile-first* untuk mencatat servis, tuning, dan perawatan motor harian.
Dirancang untuk skuter matic (contoh uji: Vario 160) — seluruh komponen, rumus
kesehatan, dan preset disusun untuk kebiasaan pemakaian matic, bukan motor rantai.

Semua data disimpan **lokal di perangkat** (IndexedDB). Tidak ada server, tidak
ada akun, tidak ada pelacakan. Berjalan penuh *offline* setelah sekali dibuka.

---

## Fitur

| Fitur | Ringkasan |
| --- | --- |
| **Dashboard Pit Coach** | Ringkasan kesehatan motor, banner rekomendasi AI, grid health per komponen, aksi cepat 1-tap. |
| **OCR spedometer AI** | Foto spedometer → Gemini 2.5 Flash Vision membaca total ODO (dibedakan dari Trip A/B & jam). Kompresi WebP klien maks 1200px / kualitas 0.75. Ada mode demo bila API tidak tersedia. |
| **Input suara** | Web Speech API (`id-ID`) → parser maksud → pra-isi form log. Contoh: *"pasang ring washer di kilometer 30 ribu dan ganti oli"*. Pengguna meninjau lalu menekan Simpan. |
| **Riwayat & logbook** | Timeline servis dengan filter kategori, pencarian, lampu besar foto, edit/hapus, ekspor JSON & CSV. |
| **Setup aktif** | Spesifikasi roller, per CVT, tekanan ban, dll. ikut tercatat saat log bertanda "Update setup". |
| **Prediksi perawatan** | Status AMAN / PERLU PERHATIAN / TERLAMBAT dihitung dari jarak tempuh **dan** waktu sejak servis terakhir, plus rata-rata harian. |
| **Aturan interval global** | Interval KM & hari per komponen, bisa diubah massal di Setelan atau sekali-tap dari form log. |
| **Tanpa jadwal** | Setiap komponen bisa dipilih **"Tidak memilih"** — pengingat nonaktif, komponen dikeluarkan dari health bar & banner, tetap bisa dicatat servisnya. |
| **Backup & restore** | Ekspor/impor JSON (seluruh state) dan CSV (riwayat log saja). |
| **PWA** | Manifest, service worker (Workbox), pintasan "Update KM cepat" & "Riwayat servis", instalable ke home screen. |

### Komponen yang dilacak (7)

Oli Mesin · Oli Gardan · Servis CVT · V-Belt · Kampas Rem · Ban · Coolant

> Tidak ada kategori **Rantai** — skuter matic tidak memakai rantai.

### Preset cepat

Ganti Oli Mesin · Oli Mesin + Gardan · Servis & Tuning CVT · Update KM Saja

---

## Stack

- **React 19** + **TypeScript 7** + **Vite 8**
- **Tailwind CSS 4** (desain gelap kokpit otomotif, glassmorphism)
- **Framer Motion 14** untuk animasi lapisan & transisi
- **Lucide React** untuk ikon
- **idb** — pembungkus IndexedDB
- **vite-plugin-pwa 2** — manifest + service worker Workbox

---

## Menjalankan

Prasyarat: **Node.js 20+**.

```bash
# 1. instal dependensi
npm install

# 2. mode pengembangan (http://localhost:5173)
npm run dev

# 3. cek tipe + build produksi ke ./dist
npm run build

# 4. pratinjau build produksi
npm run preview
```

> `npm run build` menjalankan `tsc --noEmit` lebih dulu — error tipe akan
> menggagalkan build.

### Konfigurasi API (opsional)

Salin `.env.example` menjadi `.env`:

```bash
cp .env.example .env
```

| Variabel | Fungsi |
| --- | --- |
| `VITE_GEMINI_PROXY_URL` | URL proxy server Gemini. Kosongkan untuk panggilan langsung dengan API key yang dimasukkan di **Setelan → AI Vision**. |

Tanpa API key sekalipun aplikasi tetap berfungsi penuh: OCR jatuh ke **mode
demo**, dan seluruh pencatatan/prediksi berjalan lokal.

Untuk pemakaian publik, gunakan proxy agar API key tidak bocor ke sisi klien —
lihat catatan di dalam `.env.example`.

---

## Deploy (Cloudflare Pages + Pages Functions)

Aplikasi ini **statis** (`dist/`) + IndexedDB (local-first), jadi cukup hosting
static ber-HTTPS. Fitur PWA install, service worker, dan Web Speech **wajib**
secure context (HTTPS).

Repo ini sudah menyertakan proxy AI siap pakai di `functions/api/gemini.ts`
(Cloudflare Pages Functions) yang menangani **OCR spedometer** dan **input
suara** sekaligus. API key Gemini disimpan di sisi server — tidak pernah masuk
bundle browser.

### 1. Siapkan API key

Ambil gratis di <https://aistudio.google.com/apikey>.

### 2. Deploy lewat dashboard (paling mudah)

1. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, pilih repo ini.
2. Build command: `npm run build` — Build output directory: `dist`.
3. **Settings → Environment variables** (Production *dan* Preview):

   | Nama | Nilai | Catatan |
   | --- | --- | --- |
   | `GEMINI_API_KEY` | `AIza...` | klik **Encrypt** — rahasia |
   | `VITE_GEMINI_PROXY_URL` | `/api/gemini` | build-time, boleh terlihat |

4. Save & Deploy. Selesai — `https://<project>.pages.dev`.

`functions/` terdeteksi otomatis; `public/_routes.json` membatasi invokasi
Function hanya ke `/api/*` sehingga aset statis tetap **gratis tanpa batas**.

### 3. Deploy lewat CLI

```bash
npx wrangler login
npm run deploy        # build + wrangler pages deploy
```

Set `GEMINI_API_KEY` di dashboard seperti langkah 2.3 (CLI tidak mengunggah
rahasia dari `wrangler.toml`).

### 4. Uji proxy secara lokal

```bash
cp .dev.vars.example .dev.vars   # isi GEMINI_API_KEY
npm run preview:cf               # http://localhost:8788
```

`npm run preview:cf` menjalankan `wrangler pages dev` sehingga
`functions/api/gemini.ts` ikut dieksekusi. Untuk memakainya dari `npm run dev`
(:5173), set `VITE_GEMINI_PROXY_URL=http://localhost:8788/api/gemini` di `.env`.

### Alternatif hosting

| Opsi | AI proxy | Catatan |
| --- | --- | --- |
| **Cloudflare Pages** | ✅ bawaan repo ini | gratis, bandwidth tanpa batas |
| Netlify | perlu `netlify/functions/` | ubah path, set `VITE_GEMINI_PROXY_URL` |
| Vercel | perlu `api/gemini.ts` | ubah path, set `VITE_GEMINI_PROXY_URL` |
| GitHub Pages | ❌ tidak ada serverless | **jangan** simpan key di browser |

> Tanpa proxy, API key yang diisi di **Setelan → AI Vision** disimpan di
> IndexedDB perangkat. Itu aman untuk pemakaian pribadi, tetapi **jangan**
> dibagikan ke banyak pengguna.

---

## Arsitektur singkat

```
src/
├─ components/     # UI bersama: sheet, kartu health, banner AI, toggle, dll.
├─ screens/        # Dashboard, History, Garage, Settings
├─ hooks/
│  └─ useGarage.ts # store tunggal: seluruh state + aksi, disimpan ke IndexedDB
├─ lib/
│  ├─ health.ts    # rumus kesehatan, prioritas, rekomendasi
│  ├─ state.ts     # skema, default, normalisasi data lama
│  ├─ ocr.ts       # pemanggilan Gemini Vision + fallback demo
│  ├─ voice.ts     # Web Speech API + parser maksud (heuristik lokal)
│  ├─ backup.ts    # ekspor/impor JSON & CSV
│  └─ image.ts     # kompresi WebP sisi klien
├─ data/           # definisi kategori, preset, data demo (seed)
└─ types.ts        # tipe domain
```

**Persistensi:** seluruh `GarageState` disimpan sebagai satu rekaman di database
IndexedDB `motolog-ai` → *object store* `garage` → kunci `state`. Foto ikut
disimpan sebagai *data URL* WebP hasil kompresi.

**Data demo:** aplikasi terisi garasi contoh *Vario 160 ABS* (plat `B 1846 MTL`,
julukan "Si Hitam") pada 30.000 KM. Bisa direset dari **Setelan → Reset semua
data**.

---

## Perilaku yang perlu diketahui

- **"Tidak memilih"** pada interval berarti komponen *nonaktif*: ia tidak
  dihitung dalam health bar, banner AI, atau ringkasan urgensi — namun tetap
  muncul di Garasi dengan lencana **NONAKTIF** dan tetap bisa dicatat servisnya.
  Memilih angka target kembali mengaktifkan jadwalnya.
- **Odometer tidak boleh mundur.** Saat menyimpan log dengan KM lebih rendah
  dari yang tercatat, form menolaknya (kecuali mode "Update KM saja" yang juga
  menolak penurunan).
- **Escape** menutup lapisan teratas saja (ada penumpukan modal), dan gulungan
  body dikunci secara berhitung saat sheet terbuka.

---

## Browser yang didukung

Chrome/Edge & Safari modern (desktop & mobile). Pemasangan PWA didukung di
Chromium dan iOS Safari (via *Add to Home Screen*). Pengenalan suara
menggunakan `webkitSpeechRecognition`, sehingga paling optimal di Chrome.

---

## Lisensi

Proyek pribadi — hak guna mengikuti pemilik repositori.
