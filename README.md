# Axioris web client

This repository contains the Axioris social web experience. It is a full-stack application built with:

- **Frontend**: React 19 + TypeScript, Vite, React-Bootstrap
- **Backend**: Express 5, Prisma, WebSocket realtime
- **Internationalization**: i18next (client + server) with JSON resources in `locales/`
- **Translations**: Weblate-ready configuration in `weblate/`

## Getting started

```bash
npm install
npm run dev
```

This runs the API server (`server/index.ts`) and Vite dev server in parallel. The application expects a SQLite database under `prisma/dev.db`; run `npx prisma migrate dev` if you have not already created it.

### Useful scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start API + Vite dev servers with hot reload |
| `npm run dev:client` | Launch Vite only (useful when the API runs elsewhere) |
| `npm run server` | Watch/restart the API server in isolation |
| `npm run build` | Production build via Vite |
| `npm run lint` | ESLint across the monorepo |

## Project structure

```text
src/               React application
server/            Express API + realtime gateway
locales/           i18n resource bundles (JSON per language)
weblate/           Translation infrastructure metadata
prisma/            Database schema and migrations
public/            Static assets served by Vite
```

## Internationalization

The application boots i18next on both client and server:

- `src/i18n/config.ts` registers i18next with the React adapter and a browser language detector (cookies + localStorage).
- `server/i18n.ts` configures i18next with the filesystem backend and Express middleware.
- Translation resources live in `locales/<lang>/common.json`. English (`en`) is the source of truth.
- The main menu exposes a language switcher; changes persist via cookies and local storage.
- Server endpoints (for example `/api/health`) use `req.t(...)` to deliver localized responses.

### Adding strings

1. Add or update keys in `locales/en/common.json` using dot notation (e.g., `nav.home`).
2. Import the key with `const { t } = useTranslation();` and call `t('nav.home')` in React components.
3. For backend responses, use `req.t('nav.home')` after the i18next middleware.
4. Run `npm run lint` to confirm the JSON remains valid.

## Weblate integration

The `weblate/` folder keeps translation automation separate from source code:

- `weblate/weblate.yaml` describes the Weblate project, component, and Git remotes. Adjust credentials before connecting a Weblate instance.
- `weblate/README.md` documents the preferred workflow and how to create a dedicated translation branch.

Typical flow:

1. Developers add English keys and push to `main`.
2. Weblate pulls updates, translators work in the UI, and Weblate pushes a translation branch.
3. Developers merge the Weblate branch back into `main` (often via PR).

## Testing and quality

- `npm run lint` — lint everything
- `npm run build` — ensure the client builds with translations embedded
- Unit tests can run via `npm run test` once the Vitest suite is configured

## Contributing

- Keep user-facing strings in `locales/en/common.json`. Avoid hard-coded English in components.
- When adding a new feature, include translations and tests where appropriate.
- See `weblate/README.md` before editing localized files directly.
