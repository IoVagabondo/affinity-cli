# Rate Limiting

The Affinity API implements rate limiting to ensure fair usage and maintain service stability. This guide explains how rate limits work, how to check your current limits, and best practices for handling them.

## Overview

Rate limiting restricts the number of API requests you can make within a specific time window. When you exceed these limits, the API returns a `429 Too Many Requests` error.

## Checking Your Rate Limits

Use the `auth rate-limit` command to check your current rate limit status:

```bash
affinity auth rate-limit
```

Example output:
```json
{
  "minute_limit": 100,
  "minute_remaining": 85,
  "monthly_limit": 10000,
  "monthly_remaining": 9932
}
```

**Fields:**
- `minute_limit` - Maximum requests per minute
- `minute_remaining` - Requests remaining in the current minute window
- `monthly_limit` - Maximum requests per month
- `monthly_remaining` - Requests remaining in the monthly window

You can also use table format for easier reading:

```bash
affinity auth rate-limit --format table
```

## Rate Limit Values

Typical rate limits (check with your Affinity account manager for exact values):

- **Standard tier**: ~100 requests per minute
- **Professional tier**: ~500 requests per minute
- **Enterprise tier**: Custom limits based on contract

**Note:** Rate limits may vary based on your subscription tier and API endpoint.

## How the CLI Handles Rate Limits

The Affinity CLI includes **automatic retry logic** with exponential backoff for rate limit errors:

1. When a `429` error is received, the CLI automatically retries the request
2. It waits with exponential backoff: `min(5000ms, 300ms * 2^retryCount) + random(0-250ms)`
3. Maximum retries: **3 attempts**
4. Random jitter prevents thundering herd issues

### Example Retry Sequence

```
Request 1: Fails with 429
→ Wait ~300ms + jitter
Request 2: Fails with 429
→ Wait ~600ms + jitter
Request 3: Fails with 429
→ Wait ~1200ms + jitter
Request 4: Final attempt
```

This happens **automatically** - you don't need to implement retry logic in your scripts.

## Best Practices

### 1. Add Delays Between Requests

When making multiple requests in a loop, add delays to stay under rate limits:

```bash
# Bad: No delays, will hit rate limit
for id in $IDS; do
  affinity person get "$id"
done

# Good: Add delay between requests
for id in $IDS; do
  affinity person get "$id"
  sleep 0.5  # Wait 500ms between requests
done
```

### 2. Use Batch Operations

Fetch multiple results in a single request when possible:

```bash
# Less efficient: Many small requests
affinity person search --term "engineer" --page-size 1
affinity person search --term "engineer" --page-size 1 --page-token "..."

# More efficient: Larger page sizes
affinity person search --term "engineer" --page-size 100 --all
```

### 3. Check Rate Limits Before Large Operations

Before running batch operations, check your remaining quota:

```bash
#!/bin/bash
REMAINING=$(affinity auth rate-limit | jq -r '.minute_remaining')

if [ "$REMAINING" -lt 10 ]; then
  echo "Low rate limit quota: $REMAINING requests remaining"
  echo "Waiting for reset..."
  sleep 60
fi

# Proceed with batch operation
for id in $IDS; do
  affinity person get "$id"
  sleep 0.5
done
```

### 4. Use Parallel Processing Wisely

Limit concurrent requests to avoid hitting rate limits:

```bash
# Use GNU parallel with job limit
cat ids.txt | parallel -j 3 "affinity person get {} && sleep 0.3"

# -j 3 = maximum 3 concurrent jobs
# sleep 0.3 = 300ms delay between requests
```

### 5. Monitor for 429 Errors

Log errors and implement backoff in your scripts:

```bash
#!/bin/bash
for id in $IDS; do
  if ! affinity person get "$id" 2>> errors.log; then
    # Check if it's a rate limit error
    if grep -q "429" errors.log; then
      echo "Rate limit hit, waiting 60 seconds..."
      sleep 60
      # Retry the request
      affinity person get "$id"
    fi
  fi
  sleep 0.5
done
```

## Rate Limit Headers

The Affinity API includes rate limit information in response headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1677649200
Retry-After: 30
```

**Headers:**
- `X-RateLimit-Limit` - Maximum requests allowed
- `X-RateLimit-Remaining` - Requests remaining in current window
- `X-RateLimit-Reset` - When the limit resets (Unix timestamp)
- `Retry-After` - Seconds to wait before retrying (on 429 errors)

The CLI's automatic retry logic respects these headers.

## Error Handling

When you hit rate limits, the CLI displays a helpful error message:

```
Error: Affinity API request failed: GET /persons (429) [Request ID: abc123]
  Hint: Rate limit exceeded. Check limits with: affinity auth rate-limit
```

Use `--verbose` to see full error details:

```bash
affinity person search --term "test" --verbose
```

## Calculating Safe Request Rates

To stay safely under rate limits:

1. **Check your limit:**
   ```bash
   LIMIT=$(affinity auth rate-limit | jq -r '.minute_limit')
   ```

2. **Calculate safe delay:**
   ```bash
   # Formula: delay_seconds = 60 / (limit * safety_factor)
   # Example: 100 req/min with 0.8 safety factor
   DELAY=$(echo "60 / ($LIMIT * 0.8)" | bc -l)
   echo "Use sleep $DELAY between requests"
   ```

3. **Apply in your script:**
   ```bash
   for id in $IDS; do
     affinity person get "$id"
     sleep $DELAY
   done
   ```

## Common Scenarios

### Scenario 1: Bulk Data Export

Exporting large datasets while respecting rate limits:

```bash
#!/bin/bash
echo "Checking rate limits..."
REMAINING=$(affinity auth rate-limit | jq -r '.minute_remaining')
echo "Remaining requests: $REMAINING"

# Export all persons with automatic pagination
affinity person search --term "a" --all --format csv > persons_export.csv

echo "Export complete"
```

The `--all` flag automatically handles pagination and respects rate limits.

### Scenario 2: Real-time Synchronization

Syncing data every N minutes:

```bash
#!/bin/bash
# Run every 5 minutes via cron
# */5 * * * * /path/to/sync.sh

# Check rate limit before starting
REMAINING=$(affinity auth rate-limit | jq -r '.minute_remaining')

if [ "$REMAINING" -lt 50 ]; then
  echo "Low quota, skipping this sync cycle"
  exit 0
fi

# Fetch recent updates
affinity person search \
  --term "engineer" \
  --min-last-interaction-date "$(date -v-5M +%Y-%m-%d)" \
  --all \
  --format json > /tmp/recent_persons.json

# Process the data
# ... your sync logic ...
```

### Scenario 3: Batch Updates

Updating many records with rate limit awareness:

```bash
#!/bin/bash
# Read IDs from file
IDS=$(cat person_ids.txt)
TOTAL=$(echo "$IDS" | wc -l)
CURRENT=0

# Check initial rate limit
REMAINING=$(affinity auth rate-limit | jq -r '.minute_remaining')
echo "Starting batch update: $TOTAL persons"
echo "Rate limit remaining: $REMAINING"

for id in $IDS; do
  CURRENT=$((CURRENT + 1))

  # Check rate limit every 10 requests
  if [ $((CURRENT % 10)) -eq 0 ]; then
    REMAINING=$(affinity auth rate-limit | jq -r '.minute_remaining')
    echo "Progress: $CURRENT/$TOTAL, Remaining: $REMAINING"

    if [ "$REMAINING" -lt 20 ]; then
      echo "Low quota, pausing for 30 seconds..."
      sleep 30
    fi
  fi

  # Perform update
  affinity person update "$id" --data '{"custom_field":"value"}'
  sleep 0.6  # ~100 requests per minute
done

echo "Batch update complete"
```

## Troubleshooting

### Problem: Constant 429 Errors

**Solution:**
1. Check your current limits: `affinity auth rate-limit`
2. Increase delays between requests
3. Reduce concurrent operations
4. Consider upgrading your API tier

### Problem: Slow Batch Operations

**Solution:**
1. Use `--all` flag instead of manual pagination
2. Increase page size: `--page-size 100`
3. Use parallel processing with limits: `parallel -j 3`

### Problem: Unpredictable Rate Limits

**Solution:**
1. Always check limits before large operations
2. Implement dynamic delays based on remaining quota
3. Use the CLI's automatic retry (already built-in)

## API Tier Comparison

| Feature | Standard | Professional | Enterprise |
|---------|----------|--------------|------------|
| Requests/min | ~100 | ~500 | Custom |
| Burst limit | 20 | 50 | Custom |
| Automatic retry | ✓ | ✓ | ✓ |
| Support | Email | Priority | Dedicated |

**Note:** Contact Affinity for exact rate limit values for your account.

## Additional Resources

- [Affinity API Documentation](https://api-docs.affinity.co/)
- [Authentication Guide](./02-auth.md)
- [Best Practices Examples](../examples/04-batch-operations.sh)

## Summary

**Key Takeaways:**
- ✓ The CLI automatically retries rate-limited requests (up to 3 times)
- ✓ Check limits with: `affinity auth rate-limit`
- ✓ Add `sleep 0.5` between requests in loops
- ✓ Use `--all` for automatic pagination
- ✓ Monitor remaining quota before large operations
- ✓ Respect `Retry-After` headers (handled automatically)

For questions about rate limits specific to your account, contact Affinity support.
