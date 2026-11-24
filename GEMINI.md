# AGENTS.md — Qiride

## Ringkasan proyek
- Fungsi: PWA catatan servis motor (odometer, logbook, prediksi perawatan) + AI OCR spedometer & input suara.
- Stack: React + Vite + TypeScript, PWA (vite-plugin-pwa), Cloudflare Pages + Pages Functions, Gemini 3.x lewat proxy.
- Struktur: `src/` (screens, components, hooks, lib) · `functions/api/gemini.ts` (proxy AI) · `shared/` (prompt & skema dipakai klien + server) · `public/` (ikon, `_headers`, `_routes.json`).
- Data: 100% lokal di IndexedDB. Nama DB `motolog-ai` **JANGAN diubah** (data pengguna lama bergantung padanya).
- Hosting: Cloudflare Pages → https://qiride.pages.dev (project `qiride`). Repo: `github.com/Qibzzz19/qiride` (private), branch `main`.
- AI: klien memanggil `VITE_GEMINI_PROXY_URL=/api/gemini`; kunci Gemini hanya di server (secret `GEMINI_API_KEY`).

## File inti (baca hanya yang perlu)
- `PROGRESS.md` — status terkini, WAJIB dibaca pertama
- `src/lib/ocr.ts`, `src/lib/voice.ts`, `shared/prompts.ts` — jalur AI
- `functions/api/gemini.ts` — proxy, allowlist model, fallback
- `vite.config.ts`, `wrangler.toml`, `public/_routes.json`, `.env.example`

## Aturan ketat
1. **JANGAN full-scan repo**; jangan baca `node_modules/`, `dist/`, `package-lock.json`.
2. Mulai sesi: baca `PROGRESS.md` → buka hanya file yang relevan dengan tugas.
3. Jangan mengubah kunci data internal: `motolog-ai` (IndexedDB & format backup), `motologOverlay`, event `motolog:offline-ready`.
4. Rahasia hanya lewat `wrangler pages secret put` atau `.dev.vars` (di-.gitignore). Jangan pernah menaruh kunci di kode/chat.
5. Deploy: `$env:VITE_GEMINI_PROXY_URL="/api/gemini"; npm run build; npx wrangler pages deploy dist --project-name qiride`.
6. Setiap selesai satu fitur/perbaikan: **WAJIB** perbarui `PROGRESS.md` pada commit yang sama.
