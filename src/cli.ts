#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { AffinityClient } from './api/client';
import { AuthEndpoint } from './api/endpoints/auth';
import { EntriesEndpoint } from './api/endpoints/entries';
import { FieldValuesEndpoint } from './api/endpoints/fieldValues';
import { FieldsEndpoint } from './api/endpoints/fields';
import { InteractionsEndpoint } from './api/endpoints/interactions';
import { ListsEndpoint } from './api/endpoints/lists';
import { NotesEndpoint } from './api/endpoints/notes';
import { OpportunitiesEndpoint } from './api/endpoints/opportunities';
import { OrganizationsEndpoint } from './api/endpoints/organizations';
import { PersonsEndpoint } from './api/endpoints/persons';
import { RelationshipsStrengthsEndpoint } from './api/endpoints/relationshipsStrengths';
import { RemindersEndpoint } from './api/endpoints/reminders';
import { registerAuthCommands } from './commands/auth';
import { registerEntryCommands } from './commands/entry';
import { registerFieldCommands } from './commands/field';
import { registerFieldValueCommands } from './commands/field-value';
import { registerInteractionCommands } from './commands/interaction';
import { registerListCommands } from './commands/list';
import { registerNoteCommands } from './commands/note';
import { registerOpportunityCommands } from './commands/opportunity';
import { registerOrganizationCommands } from './commands/organization';
import { registerPersonCommands } from './commands/person';
import { registerReminderCommands } from './commands/reminder';
import { toErrorMessage } from './utils/errors';

dotenv.config({ quiet: true });

const program = new Command();
program
  .name('affinity')
  .description('Production-grade CLI for Affinity CRM v1 API')
  .version('0.1.0')
  .option('--api-key <key>', 'Affinity API key')
  .option('--auth-mode <mode>', 'Auth mode basic|bearer', 'basic')
  .option('--format <format>', 'Output format json|table|csv', 'json')
  .option('--verbose', 'Show raw API payloads')
  .option('--compact', 'Enable compact output mode')
  .option('--no-compact', 'Disable compact output mode');

program.hook('preAction', (command) => {
  const options = command.optsWithGlobals<{ apiKey?: string; authMode?: 'basic' | 'bearer' }>();
  if (options.apiKey) process.env.AFFINITY_API_KEY = options.apiKey;
  if (options.authMode) process.env.AFFINITY_AUTH_MODE = options.authMode;
});

const client = new AffinityClient();
registerAuthCommands(program, new AuthEndpoint(client));
const personsEndpoint = new PersonsEndpoint(client);
const organizationsEndpoint = new OrganizationsEndpoint(client);
const opportunitiesEndpoint = new OpportunitiesEndpoint(client);
const listsEndpoint = new ListsEndpoint(client);
const relationshipsStrengthsEndpoint = new RelationshipsStrengthsEndpoint(client);
const resolvePersonById = async (id: string): Promise<Record<string, unknown>> =>
  (await personsEndpoint.get(id)) as Record<string, unknown>;
const resolveOrganizationById = async (id: string): Promise<Record<string, unknown>> =>
  (await organizationsEndpoint.get(id)) as Record<string, unknown>;
const resolveOpportunityById = async (id: string): Promise<Record<string, unknown>> =>
  (await opportunitiesEndpoint.get(id)) as Record<string, unknown>;
const resolveListById = async (id: string): Promise<Record<string, unknown>> =>
  (await listsEndpoint.get(id)) as Record<string, unknown>;
const resolveRelationshipStrengthsByExternalId = async (
  externalId: string
): Promise<Array<Record<string, unknown>>> =>
  relationshipsStrengthsEndpoint.listByExternalId(externalId);
registerPersonCommands(
  program,
  personsEndpoint,
  resolveOrganizationById,
  resolveOpportunityById,
  resolveListById,
  resolveRelationshipStrengthsByExternalId
);
registerOrganizationCommands(
  program,
  organizationsEndpoint,
  resolvePersonById,
  resolveOpportunityById,
  resolveListById
);
registerOpportunityCommands(program, opportunitiesEndpoint, resolvePersonById);
const entriesEndpoint = new EntriesEndpoint(client);
const fieldValuesEndpoint = new FieldValuesEndpoint(client);
const notesEndpoint = new NotesEndpoint(client);
const interactionsEndpoint = new InteractionsEndpoint(client);
registerListCommands(program, listsEndpoint, entriesEndpoint, personsEndpoint, fieldValuesEndpoint);
registerEntryCommands(program, entriesEndpoint);
registerFieldCommands(program, new FieldsEndpoint(client));
registerFieldValueCommands(program, fieldValuesEndpoint);
registerNoteCommands(
  program,
  notesEndpoint,
  resolvePersonById,
  resolveOrganizationById,
  resolveOpportunityById,
  async (id) => interactionsEndpoint.get(id) as Promise<Record<string, unknown>>
);
registerReminderCommands(program, new RemindersEndpoint(client));
registerInteractionCommands(program, interactionsEndpoint);

program.parseAsync().catch((error) => {
  const verbose = process.argv.includes('--verbose');
  console.error(toErrorMessage(error, { verbose }));
  process.exitCode = 1;
});
