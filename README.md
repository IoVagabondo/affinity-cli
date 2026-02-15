# affinity-cli

> A production-grade, fully-typed TypeScript CLI for managing Affinity CRM via v1 REST API.

## Features

- TypeScript strict mode + Zod runtime validation
- Commander.js command structure
- Axios client with auth interceptors and 429 retry/backoff
- JSON, table, CSV output formats
- Non-compact output mode by default with optional `--compact`
- `--all` auto-pagination via `page_token`
- Server-side-first search filtering for Affinity v1
- Integration tests against live Affinity API

## Installation

```bash
npm install
npm run build
npm link
```

Then run:

```bash
affinity --help
```

## Authentication

### Environment Variable (recommended)

```bash
export AFFINITY_API_KEY="your_affinity_api_key"
```

### .env

```bash
# .env
AFFINITY_API_KEY=your_affinity_api_key
```

### Command override

```bash
affinity --api-key your_affinity_api_key --auth-mode bearer auth whoami
```

## Quick Start

```bash
# Verify auth
affinity auth whoami

affinity auth rate-limit

# Search entities
affinity person search --term "john" --format table
affinity organization search --term "capital" --all
affinity opportunity search --term "seed" --format json
affinity organization search --domain "example.com" --all
affinity organization search --term "exampleco" --domain "example.com" --all

# Entity management
affinity person get 123456 --compiled
affinity person get 123456 --detailed
affinity person get 123456 --full
affinity person create --data '{"first_name":"Jane","last_name":"Doe"}'
affinity person update 123456 --data '{"first_name":"Janet"}'
affinity person assert --matching email --data '{"email":"jane@example.com","first_name":"Jane"}'
affinity organization get 291792102              # raw (single API call)
affinity organization get 291792102 --detailed   # resolved persons/opportunities/interactions (+ opportunity list refs)
affinity organization get 291792102 --full       # detailed + normalized fields

# Lists and entries
affinity list list-all --format table
affinity list create --name "Target Accounts" --type organization --public
affinity list entries 12058 --page-size 25
affinity list entries 12058 --all --page-size 25
affinity entry add 12058 --entity-id 7133202
affinity entry delete 12058 16367

# Fields and field values
affinity field list --entity-type person --format table
affinity field create --data '{"name":"Priority","value_type":"dropdown"}'
affinity field-value list --person-id 38706
affinity field-value update 20406836 --value '"High"'

# Notes (person/org/opportunity perspective)
affinity note list --person-id 38708 --page-size 25
affinity note list --organization-id 64779194 --all --detailed
affinity note list --opportunity-id 117 --full
affinity note get 22984 --full
affinity note create --data '{"content":"Met with team","type":0,"person_ids":[38708]}'
affinity note update 22984 --data '{"content":"Updated note content"}'
affinity note delete 22984
```

## Output Modes

All commands accept:

- `--format json|table|csv` (default `json`)
- `--compact` / `--no-compact` (default non-compact)
- `--verbose` (raw API payload)

Reference enrichment behavior:

- default (non-compact): raw API payload for `organization get`; selective enrichment for other commands
- `--compact`: keeps API-native ID arrays/values and skips extra reference-resolution API calls
- `person get <id>` is minimal by default (single person API call, no resolver fan-out)
- `person get <id> --detailed` enables resolver enrichment for linked references
- `organization get <id> --detailed` enables resolver enrichment for linked references
- `organization get <id> --full` includes `--detailed` plus normalized field values

`list entries` JSON behavior:

- returns `{ "pagination": { ... }, "data": [...] }`
- includes cursor metadata (`next_page_token`, `has_more`, `pages_fetched`) and counts
- `--format table|csv` prints flattened rows (`entity_name` + expanded list field columns)

`note list` detail and pagination behavior:

- default (`raw`): API-native note payloads
- `--detailed`: resolves linked references (`persons`, `associated_persons`, `interaction_persons`, `mentioned_persons`, `organizations`, `opportunities`)
- `--full`: includes `--detailed` plus `interaction` and `parent_note` summaries
- `note list` truncates `content` to the first `300` characters
- `--compact`: keeps API-native IDs and skips resolver fan-out calls
- `--format json`: returns `{ "pagination": { ... }, "data": [...] }`
- `--format table|csv`: returns flattened note rows (no envelope)

## Search Behavior

Entity search commands (`person|organization|opportunity search`) use Affinity v1 query params directly.

- `--page-size` defaults to `25` (maps to server-side `page_size`)
- `--all` iterates using server-side `next_page_token`
- `--page-token` lets you continue from a known token
- `--domain` performs server-side search using `term=<domain>` and then exact domain match filtering
- `--query <json>` passes additional raw query params to the API

Supported explicit interaction filters:

- `--with-interactions` includes both dates and persons
- `--with-opportunities`
- `--with-current-organizations` (person endpoints)
- `--min-first-email-date`, `--max-first-email-date`
- `--min-last-email-date`, `--max-last-email-date`
- `--min-last-interaction-date`, `--max-last-interaction-date`
- `--min-last-event-date`, `--max-last-event-date`
- `--min-first-event-date`, `--max-first-event-date`
- `--min-next-event-date`, `--max-next-event-date`

Examples:

```bash
# Default server-side page_size=25
affinity organization search --term "capital"

# Server-side interaction filtering
affinity organization search \
  --term "exampleco" \
  --with-interactions \
  --min-last-email-date "2025-01-01T00:00:00Z" \
  --max-next-event-date "2026-12-31T23:59:59Z"

# Raw query passthrough (server-side)
affinity organization search \
  --term "exampleco" \
  --query '{"with_opportunities":true,"page_size":100}'

# Detailed organization view
affinity organization get 291792102 --detailed

# Full organization view (includes normalized fields)
affinity organization get 291792102 --full

# Person get with resolved references
affinity person get 97844218 --detailed

# Full person context (interactions + opportunities + relationship strengths)
affinity person get 97844218 --full
```

## Commands

- `auth`: `whoami`, `rate-limit`
- `person|organization|opportunity`: `search`, `get`, `create`, `update`, `assert`
- `list`: `list-all`, `get`, `create`, `entries`, `get-entry`, `add-entry`, `delete-entry`
- `entry` (legacy): `list`, `get`, `add`, `delete`
- `field`: `list`, `create`, `delete`
- `field-value`: `list`, `update`
- `note`: `list`, `get`, `create`, `update`, `delete`
- `reminder`: `list`, `get`, `create`
- `interaction`: `list`, `get`, `create`

Relationship strengths note:

- There is no standalone `relationship-strengths` CLI command yet.
- Use `affinity person get <person_id> --full` to include `relationship_strengths`.
- `--full` implies `--detailed`.

## Development

```bash
npm run dev -- --help
npm run check
npm run type-check
npm run test
npm run test:integration
npm run build
```

Integration tests require `AFFINITY_API_KEY`.

## Contributing

See `CONTRIBUTING.md` for local setup, checks, and PR expectations.

## Security

See `SECURITY.md` for responsible disclosure guidance.

## License

MIT
