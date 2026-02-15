#!/bin/bash
# Basic Workflow Example
# Demonstrates: Authentication, search, get, and update operations
#
# Prerequisites:
# - Set AFFINITY_API_KEY environment variable
# - Or create a .env file with AFFINITY_API_KEY=your_key_here
#
# Usage: ./examples/01-basic-workflow.sh

set -e  # Exit on error

echo "=== Affinity CLI Basic Workflow Example ==="
echo ""

# 1. Verify authentication
echo "1. Checking authentication..."
affinity auth whoami --format table
echo ""

# 2. Check rate limits
echo "2. Checking API rate limits..."
affinity auth rate-limit
echo ""

# 3. Search for persons
echo "3. Searching for persons with 'john' in their name..."
affinity person search --term "john" --format table
echo ""

# 4. Search with pagination (limit to 5 results)
echo "4. Searching with pagination (first 5 results)..."
affinity person search --term "tech" --page-size 5 --format table
echo ""

# 5. Get a specific person (replace with actual ID from your data)
echo "5. Getting person details..."
echo "   Note: Replace PERSON_ID with an actual ID from your search results"
# affinity person get PERSON_ID --format table
echo "   Example: affinity person get 12345 --format table"
echo ""

# 6. Search organizations by domain
echo "6. Searching for organizations..."
affinity organization search --term "google" --format table
echo ""

# 7. List all available lists
echo "7. Listing all lists..."
affinity list list-all --format table
echo ""

# 8. Search opportunities
echo "8. Searching opportunities..."
affinity opportunity search --term "deal" --format table
echo ""

echo "=== Basic workflow complete! ==="
echo ""
echo "Next steps:"
echo "  - Try updating an entity: affinity person update <id> --data '{\"name\":\"New Name\"}'"
echo "  - Create a new person: affinity person create --data '{\"emails\":[\"test@example.com\"]}'"
echo "  - Explore other commands: affinity --help"
