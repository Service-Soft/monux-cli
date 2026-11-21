import { ApplicationConfig } from '@loopback/core';

import { {{=applicationClass}} } from './application';

/**
 * Exports the OpenAPI document of the api, into the file the first argument names, or to the console.
 */
async function exportOpenApiSpec(): Promise<void> {
    const config: ApplicationConfig = { rest: { port: 3000, host: 'localhost' } };
    const app: {{=applicationClass}} = new {{=applicationClass}}(config);
    await app.boot();
    await app.exportOpenApiSpec(process.argv[2] ?? '');
}

void exportOpenApiSpec();
