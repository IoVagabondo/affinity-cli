#!/bin/bash
# List Management Example
# Demonstrates: Creating lists, adding entries, managing list data
#
# Prerequisites:
# - Set AFFINITY_API_KEY environment variable
#
# Usage: ./examples/02-list-management.sh

set -e

echo "=== Affinity CLI List Management Example ==="
echo ""

# 1. View all existing lists
echo "1. Viewing all existing lists..."
affinity list list-all --format table
echo ""

# 2. Create a new list (uncomment to actually create)
echo "2. Creating a new list..."
echo "   Example command (commented to prevent accidental creation):"
echo "   affinity list create --name \"Sales Prospects\" --type person"
echo ""
# LIST_ID=$(affinity list create --name "Sales Prospects" --type person | jq -r '.id')
# echo "   Created list with ID: $LIST_ID"
# echo ""

# 3. Get a specific list (replace with actual ID)
echo "3. Getting list details..."
echo "   Example: affinity list get <list-id> --format table"
echo ""

# 4. List entries in a list (replace with actual ID)
echo "4. Listing entries in a list..."
echo "   Example: affinity list entries <list-id> --format table"
echo "   With pagination: affinity list entries <list-id> --page-size 10 --all"
echo ""

# 5. Add a person to a list
echo "5. Adding a person to a list..."
echo "   Example: affinity list add-entry <list-id> --entity-id <person-id>"
echo ""

# 6. Get a specific list entry
echo "6. Getting a specific list entry..."
echo "   Example: affinity list get-entry <list-entry-id> --format table"
echo ""

# 7. Delete a list entry
echo "7. Removing a person from a list..."
echo "   Example: affinity list delete-entry <list-entry-id>"
echo ""

# 8. Using field values with lists
echo "8. Managing field values for list entries..."
echo "   List fields: affinity field list --list-id <list-id>"
echo "   Get field value: affinity field-value list --list-entry-id <entry-id>"
echo "   Update field value: affinity field-value update <field-value-id> --value 'New Value'"
echo ""

echo "=== List management examples complete! ==="
echo ""
echo "Common workflow:"
echo "  1. Create a list for a specific purpose (e.g., 'Q1 Prospects')"
echo "  2. Add people/organizations to the list"
echo "  3. Use custom fields to track additional data"
echo "  4. Export list data: affinity list entries <id> --format csv > export.csv"
