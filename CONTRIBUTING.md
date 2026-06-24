# Contributing

Thanks for considering contributing to next-postman!

## Setup

```bash
git clone https://github.com/your-username/next-postman.git
cd next-postman
npx nvm use  # or ensure Node 20+
npm install
npm run dev
```

## Development Commands

| Command             | What it does              |
| ------------------- | ------------------------- |
| `npm run dev`       | Start dev server          |
| `npm test`          | Run unit tests            |
| `npm run typecheck` | TypeScript type check     |
| `npm run lint`      | ESLint                    |
| `npm run format`    | Auto-format with Prettier |
| `npm run build`     | Production build          |

## Before Committing

1. **Run checks locally:**
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```
2. **Pre-commit hook** auto-formats staged files. If it fails, fix the issue and re-stage.

## Pull Request Guidelines

- **One change per PR.** Small PRs are reviewed faster.
- **Add tests.** New features should include tests. Bug fixes should include a regression test.
- **Follow the existing code style.** Don't reformat unrelated code.
- **Keep imports clean.** No unused imports after your change.

## File Organization

```
src/
  app/              Next.js App Router (pages, API routes)
  features/         Feature modules (api-client, etc.)
    api-client/     HTTP client, collections, realtime, storage
      components/   UI components
      lib/          Business logic (one file per concern)
      store/        Zustand state + persistence
```

## Architecture Notes

- **State:** Zustand store in `useApiStore.ts`. All mutations go through store actions.
- **HTTP proxy:** Server-side `POST /api/proxy` does the actual fetch. Browser sends headers via `X-Proxy-*` headers.
- **Realtime:** WebSocket/SSE connections are managed in `realtimeConnection.ts` with a generation-number guard against stale callbacks.
- **Storage:** localStorage for tabs/history/collections. Optional git-native File System Access for workspace persistence.
- **Tests:** Vitest + jsdom. Tests are co-located (`file.test.ts` next to `file.ts`).
