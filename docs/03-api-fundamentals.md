# 03 API Fundamentals

## API Scope

This project targets:

- Base URL: `https://api.affinity.co/`
- API version: **v1 only**

## Response Shape Reality

Affinity v1 can return arrays under different top-level keys depending on endpoint, for example:

- `persons`
- `organizations`
- `opportunities`
- `lists`
- `fields`
- `field_values`

The CLI normalizes these for command output.

## Search Fundamentals

Entity search uses the API `term` parameter and optional query params.

Important behavior:

- Search is literal/term-driven, not semantic ranking.
- Domain-specific lookup should use `--domain`.
- `--domain` performs server-side search with `term=<domain>` and then exact domain matching.

## Server-Side Querying

Entity `search` supports server-side options including:

- `with_interaction_dates`
- `with_interaction_persons`
- `with_opportunities`
- `with_current_organizations` (person endpoints)
- `min_{interaction_type}_date`
- `max_{interaction_type}_date`
- `page_size`
- `page_token`

CLI exposes `--with-interactions` for both interaction params, and `--query <json>` for raw passthrough.

## Pagination Rules

- Default search `page_size` is `25`.
- `--all` keeps the same query params across pages and only advances `page_token`.
- A missing `next_page_token` means pagination is complete.

## Write Path Fundamentals

Common write operations:

- Entity `create` / `update`
- `assert` (search + create/update client-side upsert)
- `field-value update` for field-level data changes

## Useful Patterns

```bash
# Exact organization by domain
affinity organization search --domain example.com --all

# Include interaction metadata server-side
affinity organization search --term exampleco --with-interactions --with-opportunities

# Pull one organization (raw, single API call)
affinity organization get 300000002

# Pull one organization with enriched relations
affinity organization get 300000002 --detailed

# Pull one organization with maximum detail
affinity organization get 300000002 --full
```
