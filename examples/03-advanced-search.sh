#!/bin/bash
# Advanced Search Example
# Demonstrates: Complex filtering, pagination, date ranges, relationship filters
#
# Prerequisites:
# - Set AFFINITY_API_KEY environment variable
#
# Usage: ./examples/03-advanced-search.sh

set -e

echo "=== Affinity CLI Advanced Search Example ==="
echo ""

# 1. Basic search with pagination
echo "1. Search with custom page size..."
affinity person search --term "developer" --page-size 5 --format table
echo ""

# 2. Fetch all results with --all flag
echo "2. Fetch all results (auto-pagination)..."
echo "   Example: affinity person search --term 'manager' --all --format csv > results.csv"
echo "   Note: Use with caution on large datasets!"
echo ""

# 3. Search with interaction date filters
echo "3. Search persons by interaction date range..."
echo "   Find people contacted in the last 30 days:"
MIN_DATE=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d '30 days ago' +%Y-%m-%d)
echo "   affinity person search --term 'engineer' --min-last-interaction-date $MIN_DATE --format table"
echo ""

# 4. Search with relationship filters
echo "4. Search with relationship filters..."
echo "   Find people with interactions:"
echo "   affinity person search --term 'engineer' --with-interactions --format table"
echo ""
echo "   Find people with opportunities:"
echo "   affinity person search --term 'engineer' --with-opportunities --format table"
echo ""

# 5. Organization search by domain
echo "5. Search organizations by exact domain..."
echo "   affinity organization search --domain 'example.com' --format table"
echo ""

# 6. Combined filters
echo "6. Complex search with multiple filters..."
echo "   Example combining query, date range, and relationships:"
MAX_DATE=$(date +%Y-%m-%d)
echo "   affinity person search \\"
echo "     --term 'engineer' \\"
echo "     --min-first-email-date '2024-01-01' \\"
echo "     --max-last-interaction-date '$MAX_DATE' \\"
echo "     --with-interactions \\"
echo "     --page-size 20 \\"
echo "     --format table"
echo ""

# 7. Different output formats for different use cases
echo "7. Output format examples..."
echo ""
echo "   JSON (default, best for parsing):"
echo "   affinity person search --term 'test' --format json | jq '.[] | {name: .name, email: .emails[0]?}'"
echo ""
echo "   Table (best for human reading):"
echo "   affinity person search --term 'test' --format table"
echo ""
echo "   CSV (best for spreadsheets):"
echo "   affinity person search --term 'test' --format csv > export.csv"
echo ""

# 8. Search opportunities with filters
echo "8. Search opportunities..."
echo "   affinity opportunity search --term 'deal' --page-size 10 --format table"
echo ""

# 9. Notes search with perspective filters
echo "9. Search notes by perspective..."
echo "   Notes related to a person:"
echo "   affinity note list --person-id <id> --format table"
echo ""
echo "   Notes related to an organization:"
echo "   affinity note list --organization-id <id> --format table"
echo ""
echo "   Notes related to an opportunity:"
echo "   affinity note list --opportunity-id <id> --format table"
echo ""

echo "=== Advanced search examples complete! ==="
echo ""
echo "Tips:"
echo "  - Use --verbose to see raw API responses"
echo "  - Use --compact for simplified nested object display"
echo "  - Combine with jq for powerful JSON processing"
echo "  - Use --all with caution on large datasets (respects rate limits)"
