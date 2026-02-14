# 02 Auth

## Overview

`affinity-cli` supports both auth styles used by Affinity API v1:

- Basic Auth (`-u :API_KEY` equivalent)
- Bearer token auth

## Configuration Sources

Auth values are resolved in this order:

1. CLI flags
2. Environment variables
3. `.env` file

Supported variables:

- `AFFINITY_API_KEY`
- `AFFINITY_AUTH_MODE` (`basic` or `bearer`)

## Recommended Setup

```bash
export AFFINITY_API_KEY="your_key"
export AFFINITY_AUTH_MODE="basic"
```

Or in `.env`:

```bash
AFFINITY_API_KEY=your_key
AFFINITY_AUTH_MODE=basic
```

## Per-Command Override

```bash
affinity --api-key your_key --auth-mode bearer auth whoami
```

## Validation Commands

Use these first when troubleshooting:

```bash
affinity auth whoami
affinity auth rate-limit
```

## Common Failure Cases

- Missing key: `AFFINITY_API_KEY` not set and no `--api-key` provided.
- Wrong mode: some environments behave differently with `basic` vs `bearer`.
- Expired/invalid key: auth endpoints fail immediately.

## Security Notes

- Never commit real `.env` values.
- Prefer GitHub Actions secrets for CI integration tests.
- Rotate keys if they were exposed in logs or screenshots.
