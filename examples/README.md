# Affinity CLI Examples

This directory contains example scripts demonstrating various use cases and patterns for the Affinity CLI.

## Prerequisites

All examples require:
- Affinity CLI installed (`npm install -g affinity-cli` or build from source)
- `AFFINITY_API_KEY` environment variable set
- Bash shell (for `.sh` scripts)
- Python 3.8+ (for `.py` scripts)

Optional but recommended:
- `jq` for JSON processing in shell scripts
- GNU `parallel` for parallel batch operations

## Setup

```bash
# Set your API key
export AFFINITY_API_KEY="your_api_key_here"

# Or create a .env file in the project root
echo "AFFINITY_API_KEY=your_api_key_here" > .env

# Make shell scripts executable
chmod +x examples/*.sh
```

## Examples Overview

### 01-basic-workflow.sh
**Basic operations for getting started**

Demonstrates:
- Authentication verification (`whoami`, `rate-limit`)
- Simple search operations
- Viewing persons, organizations, and opportunities
- Different output formats (JSON, table, CSV)

```bash
./examples/01-basic-workflow.sh
```

### 02-list-management.sh
**Managing lists and list entries**

Demonstrates:
- Creating and viewing lists
- Adding/removing entries
- Managing field values
- Exporting list data

```bash
./examples/02-list-management.sh
```

### 03-advanced-search.sh
**Advanced search and filtering**

Demonstrates:
- Pagination (`--page-size`, `--all`)
- Date range filters (`--min-first-email-date`, `--max-last-interaction-date`)
- Relationship filters (`--with-interactions`, `--with-opportunities`)
- Domain-based organization search
- Different output formats and modes
- Combining multiple filters

```bash
./examples/03-advanced-search.sh
```

### 04-batch-operations.sh
**Processing multiple entities efficiently**

Demonstrates:
- Creating multiple entities from data
- Upsert pattern with `assert` command
- Batch enrichment and export
- Rate limiting and error handling
- Parallel processing patterns

```bash
./examples/04-batch-operations.sh
```

### 05-agent-integration.py
**Python wrapper for AI agents and automation**

Demonstrates:
- Programmatic CLI usage from Python
- Error handling and retries
- Common workflows (upsert, search, export)
- Finding duplicates
- Enrichment pipelines

```bash
python examples/05-agent-integration.py
```

## Common Patterns

### Error Handling
```bash
# Continue on errors, log failures
if ! affinity person create --data "$data" 2>> errors.log; then
  echo "Failed: $data" >> failures.log
fi
```

### Rate Limiting
```bash
# Check current rate limits
affinity auth rate-limit

# Add delays in batch operations
for id in $IDS; do
  affinity person get "$id"
  sleep 0.5  # Wait 500ms between requests
done
```

### Pagination
```bash
# Manual pagination
affinity person search --term "test" --page-size 10

# Auto-fetch all pages
affinity person search --term "test" --all
```

### Upsert Pattern
```bash
# Create if not exists, update if exists (by email)
affinity person assert \
  --matching email \
  --data '{"email":"test@example.com","first_name":"Test","last_name":"User"}'
```

### Output Processing
```bash
# Extract specific fields with jq
affinity person search --term "engineer" | \
  jq '.[] | {name: .name, email: .emails[0]?}'

# Export to CSV
affinity list entries <list-id> --format csv > export.csv

# Pretty table for humans
affinity person search --term "test" --format table
```

## Agent Integration Guidelines

For AI agents and automation scripts:

1. **Always use JSON format** for programmatic parsing
   ```bash
   affinity person search --term "test" --format json
   ```

2. **Handle errors gracefully**
   ```python
   try:
       result = subprocess.run(cmd, capture_output=True, check=True)
   except subprocess.CalledProcessError as e:
       # Handle error, check e.stderr for details
   ```

3. **Respect rate limits**
   - Check limits: `affinity auth rate-limit`
   - Add delays between requests (500ms recommended)
   - Use bulk operations when available

4. **Use verbose mode for debugging**
   ```bash
   affinity person get 123 --verbose
   ```

5. **Prefer `assert` for upserts** to avoid duplicates
   ```bash
   affinity person assert --matching email --data '{"email":"test@example.com",...}'
   ```

6. **Validate API key before operations**
   ```bash
   if ! affinity auth whoami > /dev/null 2>&1; then
     echo "Invalid API key"
     exit 1
   fi
   ```

## Tips

- **Start small**: Test with `--page-size 5` before using `--all`
- **Use `--compact`**: Simplifies nested objects in output
- **Check examples first**: Most use cases are covered here
- **Read the docs**: See `/docs` directory for detailed API documentation
- **Use `--help`**: Every command has help text (`affinity person search --help`)

## Troubleshooting

### "Authentication failed"
- Verify `AFFINITY_API_KEY` is set correctly
- Test with: `affinity auth whoami`

### "Rate limit exceeded"
- Check limits: `affinity auth rate-limit`
- Add delays between requests
- Reduce batch size

### "Command not found: affinity"
- Ensure CLI is in PATH
- Run `npm link` if installed from source
- Or use `node dist/cli.js` directly

### JSON parsing errors
- Validate JSON: `echo '...' | jq`
- Use single quotes to avoid shell interpolation
- Escape special characters properly

## Further Reading

- [Main README](../README.md) - Installation and basic usage
- [API Documentation](../docs/) - Detailed endpoint documentation
- [Contributing Guide](../CONTRIBUTING.md) - Development setup
- [Agent Guidelines](../AGENTS.md) - For CLI contributors
