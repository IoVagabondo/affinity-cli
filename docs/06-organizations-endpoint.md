# 06 Organizations Endpoint

Source: `docs/Affinity API v1.postman_collection.json` (Organizations group)

## Overview

Affinity v1 Organizations APIs manage organization records and organization-specific metadata:

- organization CRUD-like operations (`/organizations`, `/organizations/{organization_id}`)
- search/filter/pagination on organizations (`GET /organizations`)
- global organization field definitions (`GET /organizations/fields`)

## Organization Resource (key fields)

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique organization identifier |
| `name` | string | Organization name |
| `domain` | string | Primary domain |
| `domains` | string[] | Known domains |
| `crunchbase_uuid` | string or null | Crunchbase identifier |
| `global` | boolean | Whether record is global Affinity data |
| `person_ids` | integer[] | Associated people IDs |
| `list_entries` | object[] | List-entry memberships for this organization |
| `interaction_dates` | object | First/last/next interaction timestamps (when requested) |
| `interactions` | object | Interaction objects keyed by interaction type (when requested) |
| `opportunity_ids` | integer[] | Associated opportunities (when requested) |

## Endpoints

### 1) Create a new organization

- Method/Path: `POST /organizations`
- Request body (example in collection):
  - `name` (string)
  - `domain` (string)
  - `person_ids` (integer[])
- Returns: created organization resource

### 2) Retrieve an organization by ID

- Method/Path: `GET /organizations/{organization_id}`
- Path params:
  - `organization_id` (integer, required)
- Returns: full organization resource

### 3) Update an organization by ID

- Method/Path: `PUT /organizations/{organization_id}`
- Path params:
  - `organization_id` (integer, required)
- Request body fields shown in collection:
  - `name` (string)
  - `person_ids` (integer[])
- Returns: updated organization resource

### 4) Fetch global organization fields

- Method/Path: `GET /organizations/fields`
- Returns: array of global organization field definitions

### 5) Search and retrieve organizations

- Method/Path: `GET /organizations`
- Query params shown in collection:
  - `term`
  - `with_interaction_dates`
  - `with_interaction_persons`
  - `with_opportunities`
  - `min_{interaction_type}_date`
  - `max_{interaction_type}_date`
  - `page_size`
  - `page_token`

## Organization `get` Modes

`organization get` now has explicit detail levels.

### Raw (default)

Command:

```bash
affinity organization get 300000001
```

Behavior:

- exactly one `GET /organizations/{id}` call
- no extra resolver API calls
- returns API-native payload (`person_ids`, optional `opportunity_ids`, etc.)

### Detailed

Command:

```bash
affinity organization get 300000001 --detailed
```

Behavior:

- requests interaction metadata and opportunities from the server
- in non-compact mode, resolves:
  - top-level `person_ids` -> `persons`
  - top-level `opportunity_ids` -> `opportunities` (resolved payloads from `GET /opportunities/{id}`)
  - for each resolved opportunity, `list_entries[].list_id` -> `list_entries[].list` (while keeping `list_id`)
  - `interactions.<type>.person_ids` -> `interactions.<type>.persons`
- in `--compact`, payload remains API-native (no resolver fan-out)

### Full

Command:

```bash
affinity organization get 300000001 --full
```

Behavior:

- includes everything from `--detailed`
- additionally loads field values + field definitions and adds normalized `fields`
- slower than raw because it performs additional API calls

## Live response check (exact CLI examples)

Checked against live API on **February 14, 2026**.

### Baseline search

Command:

```bash
affinity organization search --term "exampleco" --page-size 3
```

Observed top-level keys:

- `id`
- `name`
- `domain`
- `domains`
- `crunchbase_uuid`
- `global`

### Exact domain lookup

Command:

```bash
affinity organization search --domain "example.com" --all
```

Behavior:

- CLI performs server-side `term=<domain>` search, then exact domain filtering client-side.
- Returns only organizations whose `domain` or `domains[]` exactly match the requested domain.

## Current CLI mapping

Implemented:

- `affinity organization search --term <query> [--all]`
- `affinity organization search --domain <domain> [--all]`
- `affinity organization get <organization-id> [--detailed] [--full] [--query <json>]`
- `affinity organization create --data <json>`
- `affinity organization update <organization-id> --data <json>`
- `affinity organization assert --matching email|domain|name --data <json>`

Supported search flags mapped to query params:

- `--with-interactions` (sets both interaction query params)
- `--with-opportunities`
- `--min-*-date` and `--max-*-date` variants
- `--page-size` (default `25`)
- `--page-token`
- `--query <json>` passthrough

## Important behavior notes

- Raw `organization get` is intentionally minimal and avoids resolver fan-out.
- `--detailed` is the standard “enriched” mode for organizations.
- `--full` is the maximum detail mode and includes normalized organization field values.
- Field definitions are global for organizations; list-specific list-entry fields are handled via list entry workflows, not organization entity get.
