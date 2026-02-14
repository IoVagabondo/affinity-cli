# Contributing

Thanks for contributing to `affinity-cli`.

## Development Setup

1. Use Node.js 18+.
2. Install dependencies:

```bash
npm install
```

3. Run checks:

```bash
npm run check
```

## Local Commands

```bash
npm run dev -- --help
npm run lint
npm run type-check
npm run test
npm run test:integration
npm run build
```

`test:integration` requires `AFFINITY_API_KEY` in your environment.

## Pull Requests

1. Create a feature branch from `main`.
2. Keep PRs focused and small.
3. Add or update tests for behavior changes.
4. Ensure `npm run check` passes.
5. Update `README.md` when user-facing behavior changes.

## Commit Style

Use short, descriptive commit messages, e.g.:

- `feat(search): add server-side interaction date filters`
- `fix(cli): support organizations response shape`
- `test(integration): add auth and read-only coverage`
