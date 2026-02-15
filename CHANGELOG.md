# Changelog

## 2026-02-15

### Fixed

- Corrected integration coverage in `tests/integration/persons.int.test.ts`:
- aligned endpoint calls to real signatures (`search(term, pageToken, pageSize, extraParams)`),
- validated paged response envelopes via `result.items`,
- fixed field-list params to `entityType` and normalized ID typing assertions.
- Synced docs/examples with actual CLI surface:
- search examples now use `--term` (not `--query` for search terms),
- mutation examples use `--data` (not `--json-data`),
- get enrichment examples use `--detailed` / `--full` (not `--mode`),
- assert examples use `--matching email --data ...` with matching keys in payload.
- Corrected list creation examples to use supported flags:
- `list create --name <name> --type person|organization|opportunity`.
- Updated rate-limit guide payload examples to match implemented schema:
- `minute_limit`, `minute_remaining`, `monthly_limit`, `monthly_remaining`.

### Changed

- Updated `examples/05-agent-integration.py` to match CLI behavior:
- person/organization searches use `--term`,
- person get maps modes to `--detailed`/`--full`,
- assert flow uses `--matching email` and payload-compatible data,
- list entries `--all` parsing now handles JSON envelope `{ pagination, data }`.

### Added

- Expanded notes command surface with CRUD parity:
- `note update <id> --data <json>`
- `note delete <id>`
- Added perspective-first note listing filters:
- `--person-id`, `--organization-id`, `--opportunity-id`
- Added reusable note-resolution module:
- `src/utils/note-resolution.ts`
- supports `raw | detailed | full` enrichment modes for notes
- Added generic scalar foreign-key resolver utilities in `reference-resolution`:
- `resolveRecordForeignKeyField`
- `resolveRecordsForeignKeyField`
- Added new notes endpoint docs:
- `docs/07-notes-endpoint.md`

### Changed

- Reworked `note list` to use standardized cursor pagination flow:
- `--page-size` default `25`, `--page-token`, `--all`
- JSON output now uses envelope shape:
- `{ pagination: { ... }, data: [...] }`
- `table|csv` output now uses flattened rows for notes.
- Notes endpoint implementation now parses typed note records and `next_page_token` via shared response-shape utilities.
- `note get` and `note list` now support `--detailed` and `--full`:
- `--detailed` resolves linked person/org/opportunity references
- `--full` adds interaction and parent-note summaries
- `--compact` keeps raw/API-native note output and skips resolver fan-out.

### Docs

- Updated `README.md` with new note usage examples, detail-mode behavior, and pagination envelope behavior.
- Updated `docs/01-core-concepts.md` with note detail-level model.

### Testing And Quality

- Re-ran full local gate after cleanup; validation passes with `npm run check`.
- Added unit tests for note-resolution behavior:
- `tests/unit/note-resolution.test.ts`
- Added unit tests for scalar foreign-key resolution helpers:
- `tests/unit/reference-resolution.test.ts`
- Local validation passed with `npm run check`.

## 2026-02-14

### Added

- Bootstrapped production-grade TypeScript CLI structure with strict typing, endpoint clients, and command registration architecture.
- Added core auth command set: `affinity auth whoami`, `affinity auth rate-limit`.
- Added unified entity command families for `person`, `organization`, and `opportunity` with `search`, `get`, `create`, `update`, and `assert`.
- Added list command family with first-class list workflows:
- `list-all`, `get`, `create`, `entries`, `get-entry`, `add-entry`, `delete-entry`.
- Added backward-compatible `entry` namespace wrappers:
- `entry list`, `entry get`, `entry add`, `entry delete`.
- Added field management command family:
- `field list`, `field create`, `field delete`.
- Added field-value command family:
- `field-value list`, `field-value update`.
- Added notes command family:
- `note list`, `note get`, `note create`.
- Added reminders command family:
- `reminder list`, `reminder get`, `reminder create`.
- Added interactions command family:
- `interaction list`, `interaction get`, `interaction create`.
- Added server-side pagination support (`--page-size`, `--page-token`, `--all`) across supported list/search flows.
- Added output backends: `json`, `table`, `csv`.
- Added compact-output path and raw verbose mode for troubleshooting.
- Added raw query passthrough (`--query <json>`) on entity search/get flows.
- Added domain-first organization lookup mode (`--domain`) with exact domain filtering.
- Added resolver infrastructure for linked references (persons, organizations, opportunities, list references).
- Added relationship-strength endpoint integration:
- `GET /relationships-strengths?external_id=<person_id>`.
- Added relationship-strength enrichment in person full mode:
- `relationship_strengths[].internal_id` resolved to `relationship_strengths[].internal_person`.

### Changed

- Standardized interaction toggle UX to one CLI flag:
- `--with-interactions` now represents both interaction date and participant query params.
- Introduced explicit detail levels for person `get`:
- `person get <id>` is minimal/raw by default (single API call).
- `person get <id> --detailed` enables resolver fan-out and richer linked payloads.
- `person get <id> --full` implies `--detailed` and adds relationship strengths.
- Introduced explicit detail levels for organization `get`:
- `organization get <id>` raw/minimal.
- `organization get <id> --detailed` resolves linked people/opportunities/interactions.
- `organization get <id> --full` adds normalized field compilation.
- Improved person `get` enrichment pipeline in detailed/full modes:
- resolves `current_organization_ids` and `organization_ids`,
- resolves `list_entries[].list_id` to `list_entries[].list`,
- resolves interaction participants and opportunity summaries where applicable.
- Improved organization detailed/full enrichment:
- resolves top-level linked persons and opportunities,
- resolves interaction participant references,
- resolves opportunity list-entry list references.

### Fixed

- Reduced redundant interaction output in compact mode by suppressing date-only duplicate `interactions` structures when they mirror `interaction_dates`.
- Improved command help consistency so person-specific flags are not exposed on unrelated command surfaces.

### Security

- Hardened error output policy:
- API error payloads are now shown only in verbose mode.
- Sensitive fields are recursively redacted from payload output (`token`, `authorization`, `api_key`, `apikey`, `password`, `secret`, `cookie`, `set-cookie`).

### Docs

- Added/expanded core docs set under `/docs`:
- `01-core-concepts.md`
- `02-auth.md`
- `03-api-fundamentals.md`
- `04-lists-endpoint.md`
- `05-persons-endpoint.md`
- `06-organizations-endpoint.md`
- Added live-response behavior notes and CLI-to-API mapping details for persons and organizations.
- Documented detail-level model (`raw` / `--detailed` / `--full`) for entity `get` behavior.
- Documented relationship-strength availability and usage via `person get --full`.
- Updated `README.md` quick start, output behavior, search/query semantics, and command examples to match implemented behavior.

### Testing And Quality

- Established full local quality gate via `npm run check`:
- format check, lint, type-check, unit tests, and build.
- Added targeted unit coverage for:
- reference-resolution behavior,
- interaction-resolution behavior,
- compact-output behavior,
- compiled-entity behavior,
- parse-json/pagination helpers,
- error redaction and verbose-only payload emission.

### Current Gaps (tracked)

- Person endpoint parity gaps remain:
- `DELETE /persons/{person_id}` not exposed yet.
- direct `GET /persons/fields` command not exposed yet.
- Lists create advanced options (`owner_id`, `additional_permissions`) not yet exposed.
- Broader TODO items remain in `TODO.md` (schema tightening, additional CRUD parity, expanded integration coverage).
