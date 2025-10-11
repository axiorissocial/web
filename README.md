# Axioris Web Client (Frontend)

This repository contains the **frontend** for the Axioris social web experience. It is built with:

- **Frontend**: React 19 + TypeScript, Vite, React-Bootstrap
- **Internationalization**: i18next with JSON resources in `translations/locales/`

## Architecture

The frontend and backend are **decoupled** and run as separate applications:
- **Frontend** (this repo): React SPA served by Vite dev server
- **Backend** (separate repo): Express API server with Prisma, WebSocket, etc.

The frontend communicates with the backend via REST API calls proxied through Vite's dev server.

## Getting Started

### Prerequisites

1. **Backend API Server**: You need the Axioris backend server running (default: `http://localhost:3001`)
   - See the backend repository for setup instructions
   
2. **Node.js**: Version 18+ recommended
3. **Yarn**: Package manager (or npm)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd website-new

# Install dependencies
yarn install

# Copy environment configuration
cp .env.example .env

# Edit .env and set VITE_API_URL to your backend API URL
# Default is http://localhost:3001
```

### Running the Frontend

```bash
# Start the development server
yarn dev

# Or with host exposure (accessible from other devices on your network)
yarn start
```

The frontend will be available at `http://localhost:5173` (or your configured port).

### Useful Scripts

| Script | Description |
| --- | --- |
| `yarn dev` | Start Vite dev server with hot reload |
| `yarn start` | Start Vite dev server with --host flag (network accessible) |
| `yarn build` | Production build via Vite |
| `yarn preview` | Preview production build locally |
| `yarn lint` | ESLint across the codebase |
| `yarn lint:fix` | Auto-fix ESLint issues |

## Environment Variables

Create a `.env` file in the root directory (use `.env.example` as a template):

### Frontend Configuration

```bash
# API Server URL (required)
VITE_API_URL=http://localhost:3001
```

### HMR Configuration (Optional)

For development over HTTPS or through tunnels like Cloudflare:

```bash
VITE_HMR_PROTOCOL=wss
VITE_HMR_HOST=your-domain.com
VITE_HMR_PORT=443
```

## Project structure

```text
src/               React application (components, pages, utils)
translations/      i18n resource bundles (JSON per language)
  locales/         Translation files by language
weblate/           Translation infrastructure metadata
public/            Static assets (icons, fonts, etc.)
dist/              Production build output (generated)
```

**Note**: The `server/`, `prisma/`, and related backend files have been moved to a separate repository.

## Internationalization

The application uses i18next for internationalization:

- `src/i18n/config.ts` registers i18next with the React adapter and a browser language detector (cookies + localStorage).
- Translation resources live in `translations/locales/<lang>/common.json`. English (`en`) is the source of truth.
- The main menu exposes a language switcher; changes persist via cookies and local storage.

### Adding strings

1. Add or update keys in `translations/locales/en/common.json` using dot notation (e.g., `nav.home`).
2. Import the key with `const { t } = useTranslation();` and call `t('nav.home')` in React components.
3. Run `yarn lint` to confirm the JSON remains valid.
4. For production, ensure all languages are updated (use Weblate for collaborative translation).

## API Communication

The frontend communicates with the backend via:

- REST API endpoints (prefixed with `/api`)
- WebSocket for real-time features
- All requests are proxied through Vite dev server to avoid CORS issues

Configure the backend URL in `.env`:

```bash
VITE_API_URL=http://localhost:3001
```

## Weblate integration

The `weblate/` folder keeps translation automation separate from source code:

- `weblate/weblate.yaml` describes the Weblate project, component, and Git remotes. Adjust credentials before connecting a Weblate instance.
- `weblate/README.md` documents the preferred workflow and how to create a dedicated translation branch.

Typical flow:

1. Developers add English keys to `translations/locales/en/common.json` and push to `main`.
2. Weblate pulls updates, translators work in the UI, and Weblate pushes a translation branch.
3. Developers merge the Weblate branch back into `main` (often via PR).

## Testing and quality

- `yarn lint` — lint everything
- `yarn build` — ensure the frontend builds with translations embedded
- Unit tests can run via `yarn test` once the Vitest suite is configured

## Contributing

- Keep user-facing strings in `translations/locales/en/common.json`. Avoid hard-coded English in components.
- When adding a new feature, include translations and tests where appropriate.
- See `weblate/README.md` before editing localized files directly.

