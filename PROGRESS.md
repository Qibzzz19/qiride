# PROGRESS — Qiride
Terakhir diperbarui: 2026-11-24 · commit `238d401`

## Status sekarang
- **Live**: https://qiride.pages.dev · AI OCR **aktif & teruji** (odometer 12345, confidence 0.99; diuji juga di HP).
- **Repo**: github.com/Qibzzz19/qiride (private), branch `main`, sinkron.
- **Cloudflare**: project `qiride` (Pages + Functions), secret `GEMINI_API_KEY` terpasang & terenkripsi.
- Biaya: Rp0 (statis + Functions dalam kuota gratis 100k request/hari).

## Yang dikerjakan di sesi ini (24 Nov 2026)
1. Rebranding MotoLog AI → **Qiride** (14 file). Kunci data internal **dipertahankan** (`motolog-ai`) agar catatan lama tetap terbaca.
2. `git init` + `.gitignore` (`.env`, `.dev.vars`, `dist/`, `node_modules/`) + commit awal.
3. Proxy AI di `functions/api/gemini.ts` + `wrangler.toml` + `public/_routes.json` + `_headers`.
4. Deploy pertama project `qiride`; uji endpoint (masih 503 sebelum kunci = normal).
5. Kunci Gemini dipasang via `wrangler pages secret put`.
6. **Bug besar**: `gemini-2.5-flash` sudah pensiun untuk pengguna baru → semua permintaan 502.
   Perbaikan: pindah ke model **3.x** (default `gemini-3.5-flash-lite`), pemetaan otomatis 2.5→3.x, allowlist model, dan fallback antar model (timeout langsung pindah model).
7. Uji OCR nyata: HTTP 200, odometer 12345, conf 0.99. Uji di HP: berhasil.
8. Push ke GitHub; README diberi URL live + koreksi klaim privasi (AI memakai proxy).

## Kendala & batasan
- CORS `/api/gemini` masih `*`; model sudah dibatasi tapi belum ada rate limit.
- `gemini-3.8-flash` kadang lambat/503 (otomatis fallback); default sengaja `3.5-flash-lite`.
- PWA service worker bisa menyajikan build lama → refresh 2× setelah deploy.
- Data hanya lokal per perangkat; belum ada sinkronisasi antar perangkat.

## Next step (belum dikerjakan)
1. (Disarankan) Batasi Origin `/api/gemini` ke `qiride.pages.dev` + preview, pertimbangkan rate limit.
2. Uji OCR dengan foto asli beragam (buram, cahaya malam) dan catat akurasi.
3. Uji backup/restore JSON di perangkat bersih.
4. (Opsional) Custom domain.
5. (Opsional) Sinkronisasi multi-perangkat bila diminta.

## Perintah penting
```powershell
cd "C:\1. WEB Hosting Final\Web Maintenance Motor"
$env:VITE_GEMINI_PROXY_URL = "/api/gemini"
npm run build
npx --yes wrangler@4 pages deploy dist --project-name qiride --branch main
```
