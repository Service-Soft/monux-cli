import { SchemaMigrationOptions } from '@loopback/repository';

import { {{=applicationClass}} } from './application';

/**
 * Migrates the schema of the database to the models, see https://loopback.io/doc/en/lb4/Database-migrations.html.
 * @param args - The arguments of the process: "--rebuild" drops what the schema holds first.
 */
export async function migrate(args: string[]): Promise<void> {
    const existingSchema: SchemaMigrationOptions['existingSchema'] = args.includes('--rebuild') ? 'drop' : 'alter';
    const app: {{=applicationClass}} = new {{=applicationClass}}();
    await app.boot();
    await app.migrateSchema({ existingSchema });
    // the connectors keep a pool of connections open, which would keep the process running
    process.exit(0);
}

// a migration that fails ends the process with its error, as every rejected promise nobody handles does
void migrate(process.argv);
