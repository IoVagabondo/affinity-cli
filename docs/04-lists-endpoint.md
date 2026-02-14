# 04 Lists Endpoint

Source: `docs/Affinity API v1.postman_collection.json` (Lists group)

## Overview

Affinity v1 list APIs manage:

- list containers (`/lists`)
- list membership rows (`/lists/{list_id}/list-entries`)

These endpoints are membership-oriented. For row/column cell content, use Field Values endpoints.

## API resources (key fields)

### List

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique list identifier |
| `type` | integer | Entity type (`0=person`, `1=organization`, `8=opportunity`) |
| `name` | string | List display name |
| `public` | boolean | Whether list is account-visible |
| `owner_id` | integer | Internal person owning the list |
| `creator_id` | integer | Internal person who created the list |
| `list_size` | integer | Number of entries in the list |
| `fields` | array | List-specific field definitions |
| `additional_permissions` | object[] | Explicit list-level access grants |

### List Entry

| Field | Type | Meaning |
|---|---|---|
| `id` | integer | Unique list entry identifier |
| `list_id` | integer | Parent list ID |
| `creator_id` | integer or null | Internal person who created entry |
| `entity_id` | integer | Linked person/org/opportunity |
| `entity_type` | integer | Entity type (`0`, `1`, `8`) |
| `created_at` | string | Creation timestamp |
| `entity` | object | Embedded minimal entity details |

## API endpoints

1. `GET /lists`
2. `POST /lists`
3. `GET /lists/{list_id}`
4. `GET /lists/{list_id}/list-entries`
5. `POST /lists/{list_id}/list-entries`
6. `GET /lists/{list_id}/list-entries/{list_entry_id}`
7. `DELETE /lists/{list_id}/list-entries/{list_entry_id}`

## CLI mapping

Implemented list commands:

- `affinity list list-all [--all]`
- `affinity list get <id> [--include-fields] [--with-entries] [--entries-all] [--entries-page-size <n>] [--entries-page-token <token>]`
- `affinity list create --name <name> --type <person|organization|opportunity> [--public]`
- `affinity list entries <list-id> [--all] [--page-size <n>] [--page-token <token>]`
- `affinity list get-entry <list-id> <entry-id>`
- `affinity list add-entry <list-id> --entity-id <id>`
- `affinity list delete-entry <list-id> <entry-id>`

Backward-compatible entry namespace:

- `affinity entry list <list-id> [--all] [--page-size <n>] [--page-token <token>]`
- `affinity entry get <list-id> <entry-id>`
- `affinity entry add <list-id> --entity-id <id>`
- `affinity entry delete <list-id> <entry-id>`

Legacy namespace behavior note:

- `affinity entry list` returns raw list-entry rows.
- Enrichment with per-entry `fields` (keyed by list column names) is only implemented in `affinity list entries` and `affinity list get --with-entries`.

## `affinity list get` standard output

Default output is a summary object (compact and readable), not raw full payload:

```json
{
  "id": "314724",
  "name": "VC/PE Fund Opportunities",
  "type": {
    "type_value": 8,
    "type_string": "opportunity"
  },
  "public": true,
  "owner": {
    "id": "100000001",
    "type": {
      "type_value": 1,
      "type_string": "internal"
    },
    "first_name": "Example",
    "last_name": "Owner",
    "name": "Example Owner",
    "primary_email": "redacted@example.com",
    "emails": ["redacted@example.com"]
  },
  "list_size": 62,
  "field_count": 15,
  "field_names": ["Status", "Deal Owner", "Target Ticket Size"]
}
```

Behavior notes:

- `type` is normalized to nested `{ type_value, type_string }`.
- `field_names` contains all list field names (not just a sample).
- `owner` is enriched via person lookup when possible.
- If owner lookup fails, `owner` falls back to `{ "id": "<owner_id>" }`.
- `creator_id` is present in the internal summary object; it is hidden only when `--compact` is enabled.
- `--include-fields` appends the full `fields` array.
- `--with-entries` appends paged or fully-collected entries summary.
- entries returned by `--with-entries` are enriched exactly like `list entries` (including per-entry `fields` by list column name).
- `list entries` enriches each entry with a `fields` object keyed by list field names.
- person-reference field values in `list entries` are resolved to person names when possible.

## `affinity list entries` response shape

For `--format json`, `list entries` now returns an envelope:

- `pagination`: cursor and page metadata
- `data`: enriched list-entry rows

Example:

```json
{
  "pagination": {
    "mode": "page",
    "list_id": "314724",
    "page_size": 25,
    "requested_page_token": null,
    "next_page_token": "eyJw...",
    "has_more": true,
    "pages_fetched": 1,
    "returned_count": 25,
    "list_size": 62,
    "entity_type_breakdown": {
      "opportunity": 25
    }
  },
  "data": [
    {
      "id": 231278850,
      "list_id": 314724,
      "entity_id": 100574261,
      "entity_type": 8,
      "fields": {
        "Status": "Open"
      }
    }
  ]
}
```

Format behavior:

- `--format json`: envelope output (`pagination` + `data`)
- `--format table|csv`: flattened data rows only (no envelope), with:
  - core columns (`id`, `list_id`, `entity_id`, `entity_type`, `entity_name`, `created_at`)
  - list field columns expanded from `fields` (non-empty values on current page/all result)

## Pagination defaults and flags

- `list entries` default `--page-size` is `25`.
- `list get --with-entries` default `--entries-page-size` is `25`.
- `entry list` has no CLI default page size; it only sends `page_size` when `--page-size` is provided.
- `--all` / `--entries-all` auto-paginate using `next_page_token`.
- `--page-token` / `--entries-page-token` sets the initial cursor.
- in `list entries --all`, pagination metadata reports `mode: "all"` and aggregated counts.

## Important behavior notes

- `POST /lists/{list_id}/list-entries` adds membership entries; it does not create opportunities.
- Deleting a list entry removes list-specific field values for that row.
- For opportunity lists, deleting a list entry may also delete the linked opportunity (as noted in Affinity v1 docs).

## Current gaps

- create-list advanced options are not yet exposed (`owner_id`, `additional_permissions`).
