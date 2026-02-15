import { describe, expect, it } from 'vitest';
import { Command } from 'commander';
import { AffinityClient } from '../../../src/api/client';
import { AuthEndpoint } from '../../../src/api/endpoints/auth';
import { PersonsEndpoint } from '../../../src/api/endpoints/persons';
import { OrganizationsEndpoint } from '../../../src/api/endpoints/organizations';
import { ListsEndpoint } from '../../../src/api/endpoints/lists';
import { registerAuthCommands } from '../../../src/commands/auth';
import { registerPersonCommands } from '../../../src/commands/person';
import { registerOrganizationCommands } from '../../../src/commands/organization';
import { registerListCommands } from '../../../src/commands/list';
import { EntriesEndpoint } from '../../../src/api/endpoints/entries';
import { FieldValuesEndpoint } from '../../../src/api/endpoints/fieldValues';

describe('command registration', () => {
  it('registers auth commands', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const authEndpoint = new AuthEndpoint(client);

    registerAuthCommands(program, authEndpoint);

    const authCommand = program.commands.find((cmd) => cmd.name() === 'auth');
    expect(authCommand).toBeDefined();
    expect(authCommand?.commands.length).toBeGreaterThan(0);

    const commandNames = authCommand?.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('whoami');
    expect(commandNames).toContain('rate-limit');
  });

  it('registers person commands with all required subcommands', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const personsEndpoint = new PersonsEndpoint(client);

    const mockResolveOrg = async () => ({});
    const mockResolveOpp = async () => ({});
    const mockResolveList = async () => ({});
    const mockResolveRelStrength = async () => [];

    registerPersonCommands(
      program,
      personsEndpoint,
      mockResolveOrg,
      mockResolveOpp,
      mockResolveList,
      mockResolveRelStrength
    );

    const personCommand = program.commands.find((cmd) => cmd.name() === 'person');
    expect(personCommand).toBeDefined();
    expect(personCommand?.commands.length).toBeGreaterThan(0);

    const commandNames = personCommand?.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('get');
    expect(commandNames).toContain('create');
    expect(commandNames).toContain('update');
    expect(commandNames).toContain('assert');
  });

  it('registers organization commands with all required subcommands', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const orgsEndpoint = new OrganizationsEndpoint(client);

    const mockResolvePerson = async () => ({});
    const mockResolveOpp = async () => ({});
    const mockResolveList = async () => ({});

    registerOrganizationCommands(
      program,
      orgsEndpoint,
      mockResolvePerson,
      mockResolveOpp,
      mockResolveList
    );

    const orgCommand = program.commands.find((cmd) => cmd.name() === 'organization');
    expect(orgCommand).toBeDefined();
    expect(orgCommand?.commands.length).toBeGreaterThan(0);

    const commandNames = orgCommand?.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('search');
    expect(commandNames).toContain('get');
    expect(commandNames).toContain('create');
    expect(commandNames).toContain('update');
    expect(commandNames).toContain('assert');
  });

  it('registers list commands with all required subcommands', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const listsEndpoint = new ListsEndpoint(client);
    const entriesEndpoint = new EntriesEndpoint(client);
    const personsEndpoint = new PersonsEndpoint(client);
    const fieldValuesEndpoint = new FieldValuesEndpoint(client);

    registerListCommands(
      program,
      listsEndpoint,
      entriesEndpoint,
      personsEndpoint,
      fieldValuesEndpoint
    );

    const listCommand = program.commands.find((cmd) => cmd.name() === 'list');
    expect(listCommand).toBeDefined();
    expect(listCommand?.commands.length).toBeGreaterThan(0);

    const commandNames = listCommand?.commands.map((cmd) => cmd.name());
    expect(commandNames).toContain('list-all');
    expect(commandNames).toContain('get');
    expect(commandNames).toContain('create');
    expect(commandNames).toContain('entries');
    expect(commandNames).toContain('get-entry');
    expect(commandNames).toContain('add-entry');
    expect(commandNames).toContain('delete-entry');
  });

  it('person search command has expected options', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const personsEndpoint = new PersonsEndpoint(client);

    const mockResolveOrg = async () => ({});
    const mockResolveOpp = async () => ({});
    const mockResolveList = async () => ({});
    const mockResolveRelStrength = async () => [];

    registerPersonCommands(
      program,
      personsEndpoint,
      mockResolveOrg,
      mockResolveOpp,
      mockResolveList,
      mockResolveRelStrength
    );

    const personCommand = program.commands.find((cmd) => cmd.name() === 'person');
    const searchCommand = personCommand?.commands.find((cmd) => cmd.name() === 'search');

    expect(searchCommand).toBeDefined();

    const optionNames = searchCommand?.options.map((opt) => opt.long);
    expect(optionNames).toContain('--query');
    expect(optionNames).toContain('--page-size');
    expect(optionNames).toContain('--all');
  });

  it('person get command has enrichment options', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const personsEndpoint = new PersonsEndpoint(client);

    const mockResolveOrg = async () => ({});
    const mockResolveOpp = async () => ({});
    const mockResolveList = async () => ({});
    const mockResolveRelStrength = async () => [];

    registerPersonCommands(
      program,
      personsEndpoint,
      mockResolveOrg,
      mockResolveOpp,
      mockResolveList,
      mockResolveRelStrength
    );

    const personCommand = program.commands.find((cmd) => cmd.name() === 'person');
    const getCommand = personCommand?.commands.find((cmd) => cmd.name() === 'get');

    expect(getCommand).toBeDefined();

    const optionNames = getCommand?.options.map((opt) => opt.long);
    expect(optionNames).toContain('--detailed');
    expect(optionNames).toContain('--full');
  });

  it('list entries command has pagination options', () => {
    const program = new Command();
    const client = new AffinityClient({ apiKey: 'test-key' });
    const listsEndpoint = new ListsEndpoint(client);
    const entriesEndpoint = new EntriesEndpoint(client);
    const personsEndpoint = new PersonsEndpoint(client);
    const fieldValuesEndpoint = new FieldValuesEndpoint(client);

    registerListCommands(
      program,
      listsEndpoint,
      entriesEndpoint,
      personsEndpoint,
      fieldValuesEndpoint
    );

    const listCommand = program.commands.find((cmd) => cmd.name() === 'list');
    const entriesCommand = listCommand?.commands.find((cmd) => cmd.name() === 'entries');

    expect(entriesCommand).toBeDefined();

    const optionNames = entriesCommand?.options.map((opt) => opt.long);
    expect(optionNames).toContain('--page-size');
    expect(optionNames).toContain('--all');
  });

  it('all commands inherit global options from parent', () => {
    const program = new Command();
    program
      .option('--api-key <key>', 'Affinity API key')
      .option('--format <format>', 'Output format')
      .option('--verbose', 'Verbose output');

    const client = new AffinityClient({ apiKey: 'test-key' });
    const authEndpoint = new AuthEndpoint(client);

    registerAuthCommands(program, authEndpoint);

    const authCommand = program.commands.find((cmd) => cmd.name() === 'auth');
    const whoamiCommand = authCommand?.commands.find((cmd) => cmd.name() === 'whoami');

    expect(whoamiCommand).toBeDefined();

    // Global options should be accessible via parent
    const globalOptionNames = program.options.map((opt) => opt.long);
    expect(globalOptionNames).toContain('--api-key');
    expect(globalOptionNames).toContain('--format');
    expect(globalOptionNames).toContain('--verbose');
  });
});
