# 07 Notes Endpoint

Sources:

- `https://api-docs.affinity.co/#the-note-resource`
- `docs/Affinity API v1.postman_collection.json` (Notes group)

## Overview

Affinity v1 Notes APIs manage note records linked to people, organizations, opportunities, and interactions.

Core use cases in CLI:

- list notes from entity perspective (`person`, `organization`, `opportunity`)
- inspect one note in `raw | detailed | full` modes
- create/update/delete notes

## Note Resource (key fields)

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique note identifier |
| `person_ids` | integer[] | People related to the note |
| `associated_person_ids` | integer[] | People directly associated to the note |
| `interaction_person_ids` | integer[] | People on the attached interaction |
| `mentioned_person_ids` | integer[] | People @-mentioned in content |
| `organization_ids` | integer[] | Linked organizations |
| `opportunity_ids` | integer[] | Linked opportunities |
| `interaction_id` | integer or null | Linked interaction ID |
| `interaction_type` | integer or null | Interaction type enum |
| `parent_id` | integer or null | Parent note ID for replies |
| `is_meeting` | boolean | Meeting/call attachment marker |
| `content` | string | Note content |
| `type` | integer | Note type enum |
| `created_at` | string | Creation timestamp |
| `updated_at` | string or null | Last update timestamp |

## API Endpoints

1. `GET /notes`
2. `POST /notes`
3. `GET /notes/{note_id}`
4. `PUT /notes/{note_id}`
5. `DELETE /notes/{note_id}`

`GET /notes` query params used by CLI:

- `person_id`
- `organization_id`
- `opportunity_id`
- `page_size`
- `page_token`

## CLI Mapping

Implemented:

- `affinity note list [--person-id <id>] [--organization-id <id>] [--opportunity-id <id>] [--all] [--page-size <n>] [--page-token <token>] [--detailed] [--full]`
- `affinity note get <note-id> [--detailed] [--full]`
- `affinity note create --data <json>`
- `affinity note update <note-id> --data <json>`
- `affinity note delete <note-id>`

Behavior note:

- `creator_id` filter exists in API but is intentionally not exposed in CLI right now.

## Detail Modes

### Raw (default)

- single API payloads, no resolver fan-out
- keeps API-native `*_ids` fields only

### Detailed (`--detailed`)

Resolves linked IDs into summarized references while preserving source IDs:

- `person_ids` -> `persons`
- `associated_person_ids` -> `associated_persons`
- `interaction_person_ids` -> `interaction_persons`
- `mentioned_person_ids` -> `mentioned_persons`
- `organization_ids` -> `organizations`
- `opportunity_ids` -> `opportunities`

### Full (`--full`)

Includes everything from `--detailed`, plus:

- `interaction_id` -> `interaction`
- `parent_id` -> `parent_note` summary

Compact behavior:

- `--compact` forces API-native raw output and skips note resolver fan-out calls.

## Pagination Model (`note list`)

- default `--page-size` is `25`
- `--all` iterates via `next_page_token`
- `--page-token` starts from a known cursor

For `--format json`, output is an envelope:

```json
{
  "pagination": {
    "mode": "page",
    "page_size": 25,
    "requested_page_token": null,
    "next_page_token": "eyJw...",
    "has_more": true,
    "pages_fetched": 1,
    "returned_count": 25,
    "filters": {
      "organization_id": "64779194"
    }
  },
  "data": []
}
```

Format behavior:

- `--format json`: envelope (`pagination` + `data`)
- `--format table|csv`: flattened note rows only (no envelope)
- `note list` always truncates `content` to the first `300` characters

## Practical Patterns

```bash
# Notes for one organization (paged)
affinity note list --organization-id 64779194 --page-size 25

# Notes for one person (all pages) with reference resolution
affinity note list --person-id 38708 --all --detailed

# Opportunity notes with full context (interaction + parent note)
affinity note list --opportunity-id 117 --full

# Inspect one note with full context
affinity note get 22984 --full
```
