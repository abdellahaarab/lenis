# Agents — الجيل العربي الرقمي

This repository is **Al-Jeel Al-Arabi Digital Store** (e-commerce), not the upstream Lenis marketing demo.

## Cursor Cloud (required)

- Use **`.cursor/environment.json`** — port **53000**, full stack (`npm run build:all` + `npm start`).
- Do **not** use `npm run dev` on 5173 as the primary preview (Vite-only, wrong for shop/admin/API).
- Open **`/ar/shop`** and **`/admin/`** to verify.
- Set secrets: `DATABASE_URL`, `SESSION_SECRET`, `TOTP_ENCRYPTION_KEY`.

Details: [docs/CURSOR-CLOUD.md](docs/CURSOR-CLOUD.md)

## Local (owner machine)

```sh
npm run start:local   # 127.0.0.1:53000 — loopback DB only
```

Production DB credentials belong in `.env.hostinger`, not in committed files.
