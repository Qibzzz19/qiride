# PROGRESS — Qiride
Terakhir diperbarui: 2026-11-25 · sesi "logo in-app"

## Status sekarang
- **Live**: https://qiride.pages.dev · AI OCR **aktif & teruji** (odometer 12345, confidence 0.99; diuji juga di HP).
- **Repo**: github.com/Qibzzz19/qiride (private), branch `main`.
- **Cloudflare**: project `qiride` (Pages + Functions), secret `GEMINI_API_KEY` terpasang & terenkripsi.
- Biaya: Rp0 (statis + Functions dalam kuota gratis 100k request/hari).

## Sesi terakhir (25 Nov 2026) — logo in-app baru
Latar: ikon browser/PWA sudah memakai logo baru, tapi **logo di dalam aplikasi** (header Beranda + LoadingScreen) masih SVG lama (arc speedometer + huruf "M").

1. **Aset baru** `public/logo-mark.png` dari `_brand/sumber/qiride.png` (4267×4267):
   - trim area transparan → resize `contain` ke 225 px → kanvas **256×256 transparan** (padding ±6%).
   - PNG RGBA, 31 KB, sudut alpha 0, 256×256 — dipakai juga saat offline (masuk precache: 37 entries).
2. **`src/components/Logo.tsx`**: `LogoMark` kini `<img src="/logo-mark.png" alt="" aria-hidden="true" className={className + " rounded-xl object-contain"} />`.
   - `useId`, `<defs>`, `linearGradient` (`logo-bg-`/`logo-ring-`/`logo-mono-`) dan seluruh path SVG lama **dihapus**.
   - `LogoLockup` **tidak diubah**: teks "Qiri**de**" + "Smart garage" tetap.
3. **Sisa logo lama**: pencarian `logo-ring`, `logo-bg`, `logo-mono`, `M 15 37 A 17 17` di `src/` → **0 hasil** (`useId` yang tersisa hanya di `Sheet.tsx` & `Garage.tsx`, tidak terkait logo).

### Verifikasi sesi ini
- `npm run build` lolos (precache 37 entries, `dist/logo-mark.png` 31.973 byte).
- Ukuran terukur di DOM: `h-10` → **40×40 px**, `h-9` → **36×36 px**; `naturalWidth/Height` 256×256; tajam, tidak gepeng, tidak ada kotak kosong (dicek screenshot 390×844).
- Regresi: `smoke.mjs` 35 PASS · `no-km.mjs` 18 PASS · `back-nav.mjs` 25 PASS — **78 PASS, 0 FAIL**.
- **Deploy**: https://85d818ff.qiride.pages.dev → alias produksi https://qiride.pages.dev.
- Live dicek dengan cache dimatikan + reload 2×: `GET /logo-mark.png` → 200 `image/png` 31.973 B, bundle `/assets/index-CgQ9VoEm.js`, logo 40×40 tampil, badge "Proxy OCR", **0 error konsol**.

## Sesi sebelumnya (24 Nov 2026) — palet warna & kontras
1. **Basis dinaikkan** di `src/index.css` (`@theme`):
   - `--color-obsidian` `#0b0f19` → **`#141c2b`**
   - `--color-surface` `#111827` → **`#1b2434`**
   - `--color-gunmetal` `#1e293b` → **`#2a3749`**
2. **Skala slate di-override global** (dipakai ~139× untuk teks sekunder):
   - `slate-400` → `#a7b7cb` · `slate-500` → `#8fa2b8` · `slate-600` → `#7b8ea6`
   - Hasil: `slate-500` ≈ 6.6:1 dan `slate-600` ≈ 5.1:1 di atas `#141C2B` (lolos WCAG AA).
3. **Komponen di `index.css` diselaraskan**: `.glass-card`, `.glass-panel`, `.field` (+ placeholder/focus), `.field-label`, `.chip`, `.kicker`, `.btn-ghost`, `.icon-button`.
4. **Permukaan terang**: BottomNav `#0A101C/92` → `#141C2B/94`, Sheet `#0A101B` → `#161F2E`, footer sheet `#161F2E/95`, Toast `#1A2433/96`.
5. **Hex ikut diselaraskan**: `index.html` (theme-color + boot screen), `vite.config.ts` (manifest), `AppBackground.tsx`, `public/favicon.svg`, border/ring dot di `OdometerCluster`, `Dashboard`, `Garage`, `BottomNav`.
6. **Perbaikan teks usang**: label Setelan masih menulis "Gemini 2.5 Flash" → jadi "Gemini".
7. Verifikasi: build lolos, 78 PASS, screenshot 5 layar diperiksa.

## Sesi sebelumnya (24 Nov 2026) — fondasi & AI
1. Rebranding MotoLog AI → **Qiride** (14 file). Kunci data internal **dipertahankan** (`motolog-ai`).
2. `git init` + `.gitignore` + commit awal.
3. Proxy AI `functions/api/gemini.ts` + `wrangler.toml` + `public/_routes.json` + `_headers`.
4. Deploy pertama project `qiride`.
5. Kunci Gemini via `wrangler pages secret put`.
6. Model 2.5 pensiun → migrasi ke **3.x** (default `gemini-3.5-flash-lite`), pemetaan 2.5→3.x, allowlist, fallback antar model.
7. Uji OCR nyata 200 OK (odometer 12345, conf 0.99) + uji di HP.

## Kendala & batasan
- CORS `/api/gemini` masih `*`; model dibatasi tapi belum ada rate limit.
- `gemini-3.8-flash` kadang lambat/503 (otomatis fallback); default `3.5-flash-lite`.
- PWA service worker bisa menyajikan build lama → refresh 2× setelah deploy.
- Data hanya lokal per perangkat; belum ada sinkronisasi.
- **Catatan**: profil lama di IndexedDB bisa masih menyimpan `ocrModel = gemini-2.5-flash` sehingga dropdown Setelan menampilkan "· custom". Proxy tetap memetakannya ke 3.x, jadi aman — hanya kosmetik.
- **Catatan dev**: mengedit `src/components/Toast.tsx` saat dev server jalan memicu `useToast must be used inside ToastProvider` sekali (Fast Refresh tidak bisa hot-swap komponen+hook dalam satu file) → cukup refresh halaman. Bisa dihilangkan permanen dengan memisah hook ke file sendiri.
- **Catatan dev**: background shell `npm run dev` mati saat sesi tool berakhir. Jalankan detached:
  `Start-Process 'C:\Program Files\nodejs\npm.cmd' -ArgumentList 'run','dev','--','--host','--port','5173' -WorkingDirectory "<proyek>" -WindowStyle Hidden`

## Next step (belum dikerjakan)
1. (Disarankan) Batasi Origin `/api/gemini` ke `qiride.pages.dev` + preview, pertimbangkan rate limit.
2. Uji OCR dengan foto asli beragam (buram, cahaya malam) dan catat akurasi.
3. Uji backup/restore JSON di perangkat bersih.
4. (Opsional) Migrasi nilai `ocrModel` legacy 2.5 → 3.x saat memuat state.
5. (Opsional) Pisahkan `useToast` ke `src/hooks/useToast.ts` agar HMR bersih.
6. (Opsional) Custom domain / sinkronisasi multi-perangkat.

## Perintah penting
```powershell
cd "C:\1. WEB Hosting Final\Web Maintenance Motor"
$env:VITE_GEMINI_PROXY_URL = "/api/gemini"
npm run build
npx --yes wrangler@4 pages deploy dist --project-name qiride --branch main
```
