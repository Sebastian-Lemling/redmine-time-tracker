# Contributing to Redmine Tracker

## Getting Started

1. Fork and clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your Redmine connection:
   ```bash
   npm run setup
   ```
4. Start the development environment:
   ```bash
   npm run dev
   ```

## Development

- **Dev server**: `http://localhost:5173` (Vite, strict port)
- **API proxy**: `http://localhost:3001` — handles CORS for Redmine API calls
- **Path alias**: `@/*` maps to `src/*` (configured in tsconfig and Vite)

## Code Quality

Before submitting a PR, all of the following must pass with zero errors:

```bash
npm run typecheck   # TypeScript type-check (0 errors)
npm run lint        # ESLint (0 errors)
npm run test        # Vitest (all pass)
npm run build       # Production build (succeeds)
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/), enforced by commitlint.

Allowed prefixes: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`

Examples:

```
feat: add weekly summary export
fix: correct date offset in month view
refactor: extract timer logic into useTimerHandlers
```

## Pull Requests

1. Create a feature branch from `main`.
2. Open your PR against `main`.
3. Describe what changed and why.
4. Link any related issues.

## Adding Translations

1. Add the new key to the `Translations` interface in `src/i18n/translations.ts`.
2. Add the German value in the `de` object.
3. Add the English value in the `en` object.
4. Use it in components via `const { t } = useI18n()` and reference `t.yourKey`.

## Styling

- Use CSS custom properties: `--color-*` (Tailwind theme) and `--md-*` (Material Design 3 tokens).
- Do not hardcode colors. All colors must come from design tokens.
- Follow Material Design 3 guidelines for elevation, typography, and spacing.
- Use Tailwind CSS 4 utility classes where possible.
