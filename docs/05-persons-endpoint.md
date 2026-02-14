# 05 Persons Endpoint

Source: `docs/Affinity API v1.postman_collection.json` (Persons group)

## Overview

Affinity v1 Persons APIs manage person records and person-specific metadata:

- person CRUD (`/persons`, `/persons/{person_id}`)
- search/filter/pagination on persons (`GET /persons` with query params)
- global person field definitions (`/persons/fields`)

## Person Resource (key fields)

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique person identifier |
| `type` | integer | Person type (Affinity internal classification) |
| `first_name` | string | First name |
| `last_name` | string | Last name |
| `primary_email` | string | Primary email (computed by Affinity) |
| `emails` | string[] | All known email addresses |
| `organization_ids` | integer[] | Associated organization IDs |
| `opportunity_ids` | integer[] | Associated opportunity IDs |
| `current_organization_ids` | integer[] | Current organization IDs |
| `list_entries` | object[] | List-entry memberships for the person |
| `interaction_dates` | object | First/last/next interaction timestamps |
| `interactions` | object | Interaction objects keyed by interaction type |

## Endpoints

### 1) Create a new person

- Method/Path: `POST /persons`
- Request body (example in collection):
  - `first_name` (string)
  - `last_name` (string)
  - `emails` (string[])
  - `organization_ids` (integer[])
- Returns: created person resource

### 2) Retrieve a person by ID

- Method/Path: `GET /persons/{person_id}`
- Path params:
  - `person_id` (integer, required)
- Returns: full person resource, including `list_entries`, `interaction_dates`, and `interactions`

### 3) Update a person by ID

- Method/Path: `PUT /persons/{person_id}`
- Path params:
  - `person_id` (integer, required)
- Request body fields documented in collection:
  - `first_name` (string)
  - `last_name` (string)
  - `emails` (string[])
  - `primary_email` (string)
  - `organization_ids` (integer[])
  - `opportunity_ids` (integer[])
  - `current_organization_ids` (integer[])
- Returns: updated person resource

### 4) Delete a person by ID

- Method/Path: `DELETE /persons/{person_id}`
- Path params:
  - `person_id` (integer, required)
- Documented responses in collection:
  - successful delete
  - person not found
  - unauthorized request

### 5) Fetch global person fields

- Method/Path: `GET /persons/fields`
- Returns: array of field definitions (example keys include `id`, `name`, `value_type`, `allows_multiple`, `dropdown_options`)

### 6) Search and retrieve persons

- Method/Path: `GET /persons`
- Query params shown in collection:
  - `term`
  - `with_interaction_dates`
  - `with_interaction_persons`
  - `with_opportunities`
  - `with_current_organizations`
  - `min_{interaction_type}_date`
  - `max_{interaction_type}_date`
  - `page_size`
  - `page_token`

## Important behavior notes

- The collection models search via `GET /persons` plus optional query params; `term` is the primary search input.
- Interaction filtering uses `min_{interaction_type}_date` and `max_{interaction_type}_date` placeholder keys.
- `GET /persons/{person_id}` includes richer relationship and interaction payloads than search responses.

## Live response check (exact CLI examples)

Checked against live API on **February 14, 2026** with term `"example person"`.

### Baseline search

Command:

```bash
affinity person search --term "example person"
```

Top-level keys returned for first record:

- `id`
- `first_name`
- `last_name`
- `type`
- `primary_email`
- `emails`

### Search with interactions

Command:

```bash
affinity person search --term "example person" --with-interactions
```

With `--compact`, top-level keys vs baseline:

- `interaction_dates`

Observed `interaction_dates` keys:

- `first_email_date`
- `first_event_date`
- `last_email_date`
- `last_event_date`
- `last_chat_message_date`
- `last_interaction_date`
- `next_event_date`

Raw response note:

- In non-compact output (`--no-compact` or `--verbose`), the API response includes `interactions`.
- CLI resolves participant IDs into `interactions.<type>.persons` objects (`id`, `name`, `primary_email`).
- `--compact` suppresses `interactions` when it only duplicates `interaction_dates` and has no useful participants.

### Practical takeaway

- Core person identity/contact fields are unchanged by interaction flags.
- `--with-interactions` adds timeline date fields and resolved interaction participants.
- `--compact` hides duplicate `interactions` date-only objects.
- `person search --with-current-organizations` resolves only `current_organization_ids` into `current_organizations`.
- `person get` is minimal by default (single API call, no resolver fan-out).
- `person get --detailed` resolves linked relations:
  - `current_organization_ids` -> `current_organizations`
  - `organization_ids` -> `organizations`
  - `list_entries[].list_id` -> `list_entries[].list` (includes list name)
- `person get --full` adds:
  - interactions (`with_interaction_dates` + `with_interaction_persons`)
  - opportunities (`with_opportunities`)
  - `relationship_strengths` from `/relationships-strengths?external_id=<person_id>`
  - `relationship_strengths[].internal_id` resolution to `relationship_strengths[].internal_person`
- Local dev note: if your global `affinity` binary does not reflect latest code, run `npm run build && npm link`.

## Current CLI mapping

Implemented:

- `affinity person search --term <query> [--all]`
- `affinity person get <person-id> [--with-fields] [--compiled] [--with-current-organizations] [--with-interactions] [--with-opportunities] [--detailed] [--full]`
- `affinity person create --data <json>`
- `affinity person update <person-id> --data <json>`
- `affinity person assert --matching email|domain|name --data <json>`

Supported search flags mapped to query params:

- `--with-interactions` (sets both interaction date + person params)
- `--with-opportunities`
- `--with-current-organizations`
- `--min-*-date` and `--max-*-date` variants
- `--page-size`
- `--page-token`
- `--query <json>` passthrough

`person get` output enrichment:

- default: API-native output only (no resolved relation expansion)
- `--detailed`: resolves organizations, current organizations, list names, interaction persons (when interactions requested), and opportunities
- `--full`: implies `--detailed` and adds `relationship_strengths` with resolved `internal_person`

Not yet exposed in CLI:

- `DELETE /persons/{person_id}`
- direct `GET /persons/fields` command
