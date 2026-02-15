#!/usr/bin/env python3
"""
Agent Integration Example (Python)
Demonstrates how AI agents can programmatically use the Affinity CLI

Prerequisites:
- Python 3.8+
- affinity CLI installed and in PATH
- AFFINITY_API_KEY set in environment

Usage: python examples/05-agent-integration.py
"""

import json
import subprocess
import sys
from typing import Any, Dict, List, Optional


class AffinityCLI:
    """Wrapper class for Affinity CLI operations"""

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Affinity CLI wrapper

        Args:
            api_key: Optional API key (defaults to AFFINITY_API_KEY env var)
        """
        self.base_cmd = ['affinity']
        if api_key:
            self.base_cmd.extend(['--api-key', api_key])

    def _run_command(self, args: List[str], format: str = 'json') -> Any:
        """
        Execute a CLI command and return parsed output

        Args:
            args: Command arguments
            format: Output format (json, table, csv)

        Returns:
            Parsed JSON output or raw string

        Raises:
            subprocess.CalledProcessError: If command fails
        """
        cmd = self.base_cmd + args + ['--format', format]

        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=True
            )

            if format == 'json' and result.stdout.strip():
                return json.loads(result.stdout)
            return result.stdout

        except subprocess.CalledProcessError as e:
            print(f"Error executing command: {' '.join(cmd)}", file=sys.stderr)
            print(f"Error output: {e.stderr}", file=sys.stderr)
            raise

    def whoami(self) -> Dict[str, Any]:
        """Get authenticated user information"""
        return self._run_command(['auth', 'whoami'])

    def search_persons(self, query: str, page_size: int = 10,
                       fetch_all: bool = False) -> List[Dict[str, Any]]:
        """
        Search for persons

        Args:
            query: Search query
            page_size: Results per page
            fetch_all: Whether to fetch all pages

        Returns:
            List of person objects
        """
        args = ['person', 'search', '--term', query, '--page-size', str(page_size)]
        if fetch_all:
            args.append('--all')
        return self._run_command(args)

    def get_person(self, person_id: str, mode: str = 'raw') -> Dict[str, Any]:
        """
        Get person by ID

        Args:
            person_id: Person ID
            mode: Enrichment mode (raw, detailed, full)

        Returns:
            Person object
        """
        args = ['person', 'get', person_id]
        if mode == 'detailed':
            args.append('--detailed')
        elif mode == 'full':
            args.append('--full')
        return self._run_command(args)

    def create_person(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Create a new person

        Args:
            data: Person data (must include emails)

        Returns:
            Created person object
        """
        return self._run_command(['person', 'create', '--data', json.dumps(data)])

    def assert_person(self, email: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assert (upsert) a person by email

        Args:
            email: Email to match
            data: Person data to create or update

        Returns:
            Person object
        """
        payload = dict(data)
        payload.setdefault('email', email)
        return self._run_command([
            'person', 'assert',
            '--matching', 'email',
            '--data', json.dumps(payload)
        ])

    def search_organizations(self, query: Optional[str] = None,
                            domain: Optional[str] = None) -> List[Dict[str, Any]]:
        """Search for organizations"""
        args = ['organization', 'search']
        if query:
            args.extend(['--term', query])
        if domain:
            args.extend(['--domain', domain])
        return self._run_command(args)

    def list_all_lists(self) -> List[Dict[str, Any]]:
        """Get all lists"""
        return self._run_command(['list', 'list-all'])

    def get_list_entries(self, list_id: str,
                        fetch_all: bool = False) -> List[Dict[str, Any]]:
        """Get entries in a list"""
        args = ['list', 'entries', list_id]
        if fetch_all:
            args.append('--all')
        payload = self._run_command(args)
        if fetch_all and isinstance(payload, dict):
            data = payload.get('data')
            if isinstance(data, list):
                return data
            return []
        if isinstance(payload, list):
            return payload
        return []


def example_1_basic_operations():
    """Example 1: Basic CRUD operations"""
    print("=== Example 1: Basic Operations ===\n")

    cli = AffinityCLI()

    # Check authentication
    user = cli.whoami()
    print(f"Authenticated as: {user.get('email', 'Unknown')}\n")

    # Search for persons
    results = cli.search_persons("engineer", page_size=5)
    print(f"Found {len(results)} persons matching 'engineer'")

    if results:
        # Get detailed info for first result
        person_id = results[0]['id']
        detailed = cli.get_person(str(person_id), mode='detailed')
        print(f"First result: {detailed.get('name', 'No name')}\n")


def example_2_upsert_contacts():
    """Example 2: Upsert contacts from a list"""
    print("=== Example 2: Upsert Contacts ===\n")

    cli = AffinityCLI()

    contacts = [
        {"email": "alice@example.com", "first_name": "Alice", "last_name": "Smith"},
        {"email": "bob@example.com", "first_name": "Bob", "last_name": "Jones"},
    ]

    print(f"Upserting {len(contacts)} contacts...")

    for contact in contacts:
        try:
            email = contact.pop("email")
            result = cli.assert_person(email, contact)
            print(f"✓ Upserted: {result.get('name', email)}")
        except subprocess.CalledProcessError as e:
            print(f"✗ Failed to upsert {email}: {e}")

    print()


def example_3_find_duplicates():
    """Example 3: Find potential duplicate contacts"""
    print("=== Example 3: Find Potential Duplicates ===\n")

    cli = AffinityCLI()

    # Search for common names
    common_names = ["john", "smith", "jones"]

    for name in common_names:
        results = cli.search_persons(name, page_size=100, fetch_all=True)

        # Group by email domain
        by_domain: Dict[str, List[Dict]] = {}
        for person in results:
            emails = person.get('email_addresses', [])
            for email in emails:
                if '@' in email:
                    domain = email.split('@')[1]
                    by_domain.setdefault(domain, []).append(person)

        # Find domains with multiple contacts
        for domain, persons in by_domain.items():
            if len(persons) > 1:
                print(f"Found {len(persons)} contacts at {domain} matching '{name}'")

    print()


def example_4_export_list():
    """Example 4: Export list data for analysis"""
    print("=== Example 4: Export List Data ===\n")

    cli = AffinityCLI()

    # Get all lists
    lists = cli.list_all_lists()
    print(f"Found {len(lists)} lists\n")

    if lists:
        # Export first list
        list_id = str(lists[0]['id'])
        list_name = lists[0].get('name', 'Unknown')

        print(f"Exporting list: {list_name}")
        entries = cli.get_list_entries(list_id, fetch_all=True)

        # Save to JSON file
        filename = f"list_{list_id}_export.json"
        with open(filename, 'w') as f:
            json.dump(entries, f, indent=2)

        print(f"✓ Exported {len(entries)} entries to {filename}\n")


def example_5_enrichment_workflow():
    """Example 5: Enrichment workflow with error handling"""
    print("=== Example 5: Enrichment Workflow ===\n")

    cli = AffinityCLI()

    # Search for organizations
    orgs = cli.search_organizations(query="tech")

    print(f"Processing {len(orgs)} organizations...")

    enriched = []
    errors = []

    for org in orgs[:5]:  # Limit to first 5 for demo
        org_id = str(org['id'])
        try:
            # Get full details
            detailed = cli._run_command([
                'organization', 'get', org_id, '--full'
            ])
            enriched.append(detailed)
            print(f"✓ Enriched: {org.get('name', 'Unknown')}")

        except subprocess.CalledProcessError as e:
            errors.append({'id': org_id, 'error': str(e)})
            print(f"✗ Failed: {org.get('name', 'Unknown')}")

    print(f"\nSuccessfully enriched: {len(enriched)}")
    print(f"Errors: {len(errors)}\n")


def main():
    """Run all examples"""
    examples = [
        example_1_basic_operations,
        example_2_upsert_contacts,
        example_3_find_duplicates,
        example_4_export_list,
        example_5_enrichment_workflow,
    ]

    for example in examples:
        try:
            example()
        except Exception as e:
            print(f"Error in {example.__name__}: {e}\n")
            # Continue with next example

    print("=== All examples complete! ===")


if __name__ == '__main__':
    main()
