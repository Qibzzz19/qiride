# PROGRESS — Qiride
Terakhir diperbarui: 2026-11-24 · sesi "palet warna" (belum di-commit)

## Status sekarang
- **Live**: https://qiride.pages.dev · AI OCR **aktif & teruji** (odometer 12345, confidence 0.99; diuji juga di HP).
- **Repo**: github.com/Qibzzz19/qiride (private), branch `main`, sinkron sampai `da43b62`.
- **Cloudflare**: project `qiride` (Pages + Functions), secret `GEMINI_API_KEY` terpasang & terenkripsi.
- Biaya: Rp0 (statis + Functions dalam kuota gratis 100k request/hari).

## Sesi terakhir (24 Nov 2026) — palet warna & kontras
Tujuan: tetap gelap (nuansa cockpit) tapi tidak pekat, teks lebih kontras dan nyaman dibaca.

1. **Basis dinaikkan** di `src/index.css` (`@theme`):
   - `--color-obsidian` `#0b0f19` → **`#141c2b`**
   - `--color-surface` `#111827` → **`#1b2434`**
   - `--color-gunmetal` `#1e293b` → **`#2a3749`**
2. **Skala slate di-override global** (dipakai ~139× untuk teks sekunder):
   - `slate-400` → `#a7b7cb` · `slate-500` → `#8fa2b8` · `slate-600` → `#7b8ea6`
   - Hasil: `slate-500` ≈ 6.6:1 dan `slate-600` ≈ 5.1:1 di atas `#141C2B` (lolos WCAG AA).
3. **Komponen di `index.css` diselaraskan**: `.glass-card`, `.glass-panel`, `.field` (+ placeholder/focus), `.field-label`, `.chip`, `.kicker`, `.btn-ghost`, `.icon-button`.
4. **Permukaan terang**: BottomNav `#0A101C/92` → `#141C2B/94` (menyatu dengan halaman), Sheet `#0A101B` → `#161F2E`, footer sheet `#161F2E/95`, Toast `#1A2433/96`.
5. **Hex ikut diselaraskan**: `index.html` (theme-color + boot screen), `vite.config.ts` (manifest `background_color`/`theme_color`), `AppBackground.tsx`, `Logo.tsx`, `public/favicon.svg`, border/ring dot di `OdometerCluster`, `Dashboard`, `Garage`, `BottomNav`.
6. **Perbaikan teks usang**: label Setelan masih menulis "Gemini 2.5 Flash" padahal model sudah 3.x → jadi "Gemini" (tanpa versi agar tidak drift lagi).

### Verifikasi sesi ini
- `npm run build` lolos (36 precache entries).
- Regresi: `smoke.mjs` 35 PASS · `no-km.mjs` 18 PASS · `back-nav.mjs` 25 PASS — **78 PASS, 0 FAIL**.
- Screenshot 390×844 (Beranda, Riwayat, Garasi, Setelan, sheet Catat Servis) diperiksa manual.

## Sesi sebelumnya (24 Nov 2026)
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

## Next step (belum dikerjakan)
1. (Disarankan) Batasi Origin `/api/gemini` ke `qiride.pages.dev` + preview, pertimbangkan rate limit.
2. Uji OCR dengan foto asli beragam (buram, cahaya malam) dan catat akurasi.
3. Uji backup/restore JSON di perangkat bersih.
4. (Opsional) Migrasi nilai `ocrModel` legacy 2.5 → 3.x saat memuat state.
5. (Opsional) Custom domain / sinkronisasi multi-perangkat.

## Perintah penting
```powershell
cd "C:\1. WEB Hosting Final\Web Maintenance Motor"
$env:VITE_GEMINI_PROXY_URL = "/api/gemini"
npm run build
npx --yes wrangler@4 pages deploy dist --project-name qiride --branch main
```
