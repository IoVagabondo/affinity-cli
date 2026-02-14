# 01 Core Concepts

## Purpose

`affinity-cli` is a TypeScript CLI for Affinity CRM v1. It is designed for reliable terminal and agent workflows with typed validation, predictable output, and practical defaults.

## Design Principles

- Use Affinity **v1** endpoints only.
- Prefer **server-side filtering** before client-side filtering.
- Keep commands composable and script-friendly.
- Default to readable output while preserving raw access.

## Command Model

Primary command families:

- `auth`
- `person`, `organization`, `opportunity`
- `list`, `entry`
- `field`, `field-value`
- `note`, `reminder`, `interaction`

Entity commands share the same pattern:

- `search`
- `get`
- `create`
- `update`
- `assert`

Relationship strengths:

- Currently exposed via `person get --full`.
- No separate `relationship-strengths` top-level command.

Person get detail levels:

- `person get <id>`: minimal single API call (raw person payload, no resolver fan-out).
- `person get <id> --detailed`: resolves linked references (organizations, list names, interaction persons, opportunities).
- `person get <id> --full`: `--detailed` plus relationship strengths.

Organization get detail levels:

- `organization get <id>`: minimal single API call (raw organization payload, no resolver fan-out).
- `organization get <id> --detailed`: resolves linked persons/opportunities and interaction participants.
- `organization get <id> --full`: `--detailed` plus normalized organization field values.

## Output Model

Global output options:

- `--format json|table|csv` (default `json`)
- `--compact` / `--no-compact` (default non-compact)
- `--verbose` (rawer payload view)

Compact mode removes noisy metadata and flattens common nested values while keeping data usable for scripts.

## Pagination Model

- `--all` loops through `next_page_token` automatically.
- `--page-size` maps to API `page_size` and defaults to `25` for entity search.
- `--page-token` can start from a known page boundary.

## Error Model

- API failures are surfaced with status-aware messages.
- 429/temporary upstream failures use retry with backoff.
- Invalid CLI JSON arguments fail fast with explicit parse errors.

## Typical Workflow

1. Verify auth with `auth whoami`.
2. Find records with entity `search`.
3. Inspect details with `get` (`--detailed` / `--full` as needed).
4. Write changes with `update`, `assert`, or `field-value update`.
5. Export with `--format csv` when needed.
