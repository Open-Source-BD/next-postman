<p align="center">
  <picture>
    <img alt="next-postman" src="docs/screenshot.png" width="720">
  </picture>
</p>

<h1 align="center">next-postman</h1>

<p align="center">
  A free, local-first <strong>Postman alternative</strong> built with Next.js.
  <br>
  Send HTTP requests, run collections, stream WebSocket/SSE, generate code and types —
  <br>
  all in the browser, with no account, no cloud sync, and no lock-in.
</p>

<p align="center">
  <a href="https://github.com/Open-Source-BD/next-postman/actions/workflows/ci.yml">
    <img src="https://github.com/Open-Source-BD/next-postman/actions/workflows/ci.yml/badge.svg" alt="CI">
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT">
  </a>
  <a href=".nvmrc">
    <img src="https://img.shields.io/badge/node-20.19-339933?logo=node.js" alt="Node">
  </a>
  <a href="https://nextjs.org">
    <img src="https://img.shields.io/badge/Next.js-16.2-000000?logo=next.js" alt="Next.js">
  </a>
  <img src="https://img.shields.io/badge/tests-237%20passing-brightgreen" alt="Tests">
</p>

The bet: don't out-feature Postman. Win on **local, git-native, no-lock-in**. Your collections and environments are plain files you own.

---

## Features

- **HTTP client** — methods, params, headers, multiple body types (raw/JSON/form-data/urlencoded/GraphQL), 200ms-fast UI.
- **CORS-free proxy** — requests go through a server route (`/api/proxy`), so no CORS limits and full header/cookie fidelity. Auto-falls back to a **browser-direct** send when a target's bot wall (Cloudflare/Akamai) blocks the datacenter IP.
- **Collection Runner** — run a folder of requests in sequence with chaining (a run-scoped variable bag, no environment pollution) and data-file iteration via `pm.iterationData`.
- **Realtime** — **WebSocket** (browser-direct) and **Server-Sent Events** (via a streaming proxy route) with a live message log.
- **Git-native storage** — save collections/environments to a real folder on disk via the File System Access API; secret-named env vars auto-split into gitignored `*.secret.json`. Zip export fallback for Firefox/Safari.
- **Named environments** + globals, with `{{var}}` resolution, inline autocomplete, and colored-token highlighting.
- **Auth** — none, Bearer, Basic, API Key, OAuth2, JWT.
- **Import / export** — Postman collections, **OpenAPI 3.0/3.1** (JSON + YAML, internal `$ref`, `servers`→baseUrl, tags→folders), and **cURL**.
- **Code generation** — turn any request into a runnable snippet across 12 languages.
- **Response tools** — interactive JSON tree, syntax-highlighted body, **type generation** (TypeScript, Go, Rust, Python, Dart, Kotlin, Swift, Java, C#), response **diff** against the previous run, cookie jar, and test results.
- **Scripts & tests** — pre-request and test scripts in a `pm`-style sandbox.
- **Quality of life** — `Cmd-K` command palette, tab persistence, dark mode, cURL import.

## Tech Stack

| Layer      | Technology                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Framework  | [Next.js](https://nextjs.org) 16 (App Router) + [React](https://react.dev) 19                   |
| State      | [Zustand](https://github.com/pmndrs/zustand) 5                                                  |
| Language   | TypeScript 6                                                                                    |
| Tests      | [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (E2E)                |
| Components | [Storybook](https://storybook.js.org) 10                                                        |
| Linting    | ESLint + Prettier + Husky + lint-staged                                                         |
| Fonts      | Roboto + Fira Code via [`next/font`](https://nextjs.org/docs/app/api-reference/components/font) |

## Getting Started

### Prerequisites

- **Node.js 20+** (see `.nvmrc`)
- npm

### Install & Run

```bash
git clone https://github.com/Open-Source-BD/next-postman.git
cd next-postman
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Available Scripts

| Command                   | Description                            |
| ------------------------- | -------------------------------------- |
| `npm run dev`             | Start dev server                       |
| `npm run build`           | Production build                       |
| `npm start`               | Start production server                |
| `npm test`                | Run Vitest unit tests (237 tests)      |
| `npm run test:e2e`        | Run Playwright E2E tests (7 tests)     |
| `npm run typecheck`       | TypeScript type check (`tsc --noEmit`) |
| `npm run lint`            | ESLint                                 |
| `npm run format`          | Auto-format with Prettier              |
| `npm run format:check`    | Check formatting without writing       |
| `npm run storybook`       | Storybook dev server (port 6006)       |
| `npm run build-storybook` | Build Storybook static export          |

## Testing

The project has three test layers:

| Layer         | Command             | Count     | Environment           |
| ------------- | ------------------- | --------- | --------------------- |
| **Unit**      | `npm test`          | 237 tests | jsdom                 |
| **E2E**       | `npm run test:e2e`  | 7 tests   | Playwright (Chromium) |
| **Storybook** | `npm run storybook` | 5 stories | Browser               |

Unit tests are co-located alongside source files (`file.test.ts` next to `file.ts`). E2E tests live in `e2e/`. Storybook stories are in `src/components/ui/*.stories.tsx`.

### CI Pipeline

Every push/PR to `main` runs in GitHub Actions:

1. **`check`** — `typecheck` → `lint` → `format:check` → `test` → `commitlint`
2. **`e2e`** (after `check`) — Playwright E2E against a production build

## Project Structure

```
src/
  app/
    api/proxy/route.ts     # CORS-free request proxy (decompress-safe)
    api/stream/route.ts    # SSE streaming proxy
    layout.tsx, page.tsx
  features/api-client/
    components/            # UI (UrlBar, RequestPane, ResponsePane, modals, ...)
      request/             #   request-pane sub-components
      response/            #   response-pane sub-components
      realtime/            #   WebSocket/SSE panels
      sidebar/             #   sidebar + history
      tabs/                #   tab bar
      collections/         #   collection tree
      modals/              #   import/export dialogs
    lib/                   # request pipeline, parsers, codegen, storage, realtime
    store/                 # Zustand store + slices
    types/                 # domain type files (http, realtime, tab, collection, env, import)
  components/ui/           # shared UI components (PaneResizer, CodeView, KvEditor, ...)
```

## Configuration

next-postman requires **no environment variables**. All data persists to localStorage by default; optional git-native storage uses the File System Access API.

| File                   | Purpose                            |
| ---------------------- | ---------------------------------- |
| `.nvmrc`               | Node.js version (20)               |
| `.env.example`         | Documented (empty)                 |
| `.prettierrc`          | Prettier config                    |
| `commitlint.config.js` | Conventional commit rules          |
| `.husky/`              | Git hooks (pre-commit, commit-msg) |
| `vitest.config.ts`     | Test runner config                 |
| `playwright.config.ts` | E2E test config                    |
| `.storybook/`          | Storybook config                   |

## Deployment

One-click deploy on [Vercel](https://vercel.com):

1. Push your fork to GitHub
2. Import the repo at [vercel.com/import](https://vercel.com/import)
3. No environment variables needed
4. The proxy route automatically supports up to 30s requests (`maxDuration`)

> **Note on localhost APIs:** The deployed app's server-side proxy runs on Vercel's infrastructure and cannot reach your machine's `localhost`. For localhost targets, the app automatically falls back to browser-direct fetch. If your local API lacks CORS headers, add `Access-Control-Allow-Origin: https://<your-app>.vercel.app` or run the app locally with `npm run dev`.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Quick start:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Commits must follow [Conventional Commits](https://www.conventionalcommits.org/) (`type(scope): desc`). The pre-commit hook auto-formats staged files.

## Related Work

How next-postman compares to the tools it learns from:

| Tool                                        | Model                                 | Storage                          | Lock-in                            |
| ------------------------------------------- | ------------------------------------- | -------------------------------- | ---------------------------------- |
| **next-postman**                            | Free, local-first, browser-based      | Plain files on disk (git-native) | None                               |
| [Postman](https://www.postman.com)          | Freemium SaaS, account + cloud sync   | Cloud workspaces                 | Account-gated features, cloud sync |
| [Insomnia](https://insomnia.rest)           | Open-source desktop, account for sync | Local + optional cloud           | Account for sync/collaboration     |
| [Hoppscotch](https://hoppscotch.io)         | Open-source, web + self-host          | Browser/local + cloud            | Low; self-hostable                 |
| [Bruno](https://www.usebruno.com)           | Open-source desktop, offline-first    | Plain `.bru` files in git        | None                               |
| [HTTPie Desktop](https://httpie.io/desktop) | Freemium desktop                      | Local + cloud spaces             | Account for spaces                 |
| [curl](https://curl.se)                     | CLI                                   | Shell scripts                    | None                               |

next-postman is closest in spirit to **Bruno** (git-native, no-lock-in) but runs in the browser with a server-side proxy for CORS-free requests, plus a built-in collection runner, realtime (WS/SSE), and code/type generation.

### Concepts borrowed

- The `{{variable}}` + `pm.*` sandbox model from Postman/Newman.
- Git-friendly, plain-file storage from Bruno.
- OpenAPI import to bootstrap collections from an existing spec.

## License

[MIT](LICENSE) © 2026 Shamirul Islam
