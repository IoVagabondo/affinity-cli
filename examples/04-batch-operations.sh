#!/bin/bash
# Batch Operations Example
# Demonstrates: Creating multiple entities, bulk updates, batch processing
#
# Prerequisites:
# - Set AFFINITY_API_KEY environment variable
# - jq installed (for JSON processing)
#
# Usage: ./examples/04-batch-operations.sh

set -e

echo "=== Affinity CLI Batch Operations Example ==="
echo ""

# 1. Create multiple persons from data
echo "1. Creating multiple persons..."
echo "   Example: Create persons from a JSON array"
echo ""

# Sample data (commented to prevent accidental creation)
# cat << 'EOF' > /tmp/persons.json
# [
#   {"emails": ["alice@example.com"], "first_name": "Alice", "last_name": "Smith"},
#   {"emails": ["bob@example.com"], "first_name": "Bob", "last_name": "Jones"},
#   {"emails": ["carol@example.com"], "first_name": "Carol", "last_name": "Davis"}
# ]
# EOF

echo '   # Create persons from JSON array'
echo '   cat persons.json | jq -c ".[]" | while read person; do'
echo '     affinity person create --data "$person"'
echo '     sleep 0.5  # Rate limiting'
echo '   done'
echo ""

# 2. Assert/upsert pattern for safe bulk operations
echo "2. Using assert for safe upserts..."
echo "   Assert creates if not exists, updates if exists (matches by email)"
echo ""
echo '   # Upsert persons by email'
echo '   affinity person assert --matching email --data '"'"'{"email":"alice@example.com","first_name":"Alice","last_name":"Smith"}'"'"
echo '   affinity person assert --matching email --data '"'"'{"email":"bob@example.com","first_name":"Bob","last_name":"Jones"}'"'"
echo ""

# 3. Batch fetch with enrichment
echo "3. Batch fetch with enrichment..."
echo "   Get multiple persons with full details"
echo ""
echo '   # Get list of person IDs and fetch each with details'
echo '   PERSON_IDS=$(affinity person search --term "engineer" --all | jq -r ".[].id")'
echo '   for id in $PERSON_IDS; do'
echo '     affinity person get "$id" --detailed --format json >> persons_detailed.json'
echo '     sleep 0.3  # Rate limiting'
echo '   done'
echo ""

# 4. Export all data from a list
echo "4. Exporting complete list data..."
echo "   Export all entries from a list to CSV"
echo ""
echo '   affinity list entries <list-id> --all --format csv > list_export.csv'
echo ""

# 5. Batch update field values
echo "5. Batch update field values..."
echo "   Update multiple field values in a list"
echo ""
echo '   # Get all field values for a list entry'
echo '   FIELD_VALUES=$(affinity field-value list --list-entry-id <entry-id>)'
echo '   '
echo '   # Update specific field value'
echo '   affinity field-value update <field-value-id> --value "Updated Value"'
echo ""

# 6. Create notes for multiple entities
echo "6. Creating notes for multiple entities..."
echo ""
echo '   # Create notes for a list of person IDs'
echo '   PERSON_IDS="12345 12346 12347"'
echo '   for id in $PERSON_IDS; do'
echo '     affinity note create --data '"'"'{"content":"Follow-up needed","person_ids":['$id']}'"'"
echo '     sleep 0.5'
echo '   done'
echo ""

# 7. Parallel processing with rate limiting
echo "7. Parallel processing example (with GNU parallel)..."
echo "   Process multiple operations in parallel while respecting rate limits"
echo ""
echo '   # Process up to 5 requests in parallel'
echo '   cat person_ids.txt | parallel -j 5 "affinity person get {} --format json >> results.json"'
echo ""

# 8. Error handling in batch operations
echo "8. Error handling pattern..."
echo ""
echo '   # Continue on errors, log failures'
echo '   cat data.json | jq -c ".[]" | while read item; do'
echo '     if ! affinity person create --data "$item" 2>> errors.log; then'
echo '       echo "Failed: $item" >> failures.log'
echo '     fi'
echo '     sleep 0.5'
echo '   done'
echo ""

# 9. Combine search and update
echo "9. Search and bulk update pattern..."
echo ""
echo '   # Find all persons matching criteria and update a field'
echo '   PERSONS=$(affinity person search --term "needs_update" --all)'
echo '   echo "$PERSONS" | jq -r ".[].id" | while read id; do'
echo '     affinity person update "$id" --data '"'"'{"custom_field":"updated"}'"'"
echo '     echo "Updated person $id"'
echo '     sleep 0.5'
echo '   done'
echo ""

echo "=== Batch operations examples complete! ==="
echo ""
echo "Best practices for batch operations:"
echo "  - Always add sleep delays to respect rate limits (check with: affinity auth rate-limit)"
echo "  - Use assert for upserts to avoid duplicates"
echo "  - Log errors to a separate file for debugging"
echo "  - Test with small batches first"
echo "  - Use --verbose to debug issues"
echo "  - Consider using --all only when necessary (can be slow for large datasets)"
echo "  - Use parallel processing with job limits to speed up operations"
