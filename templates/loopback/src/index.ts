import { ApplicationConfig } from '@loopback/core';

import { {{=applicationClass}} } from './application';
import { environment } from './environment/environment';

export * from './application';

/**
 * Starts the api.
 * @param options - How it is configured.
 * @returns The running application.
 */
export async function main(options: ApplicationConfig = {}): Promise<{{=applicationClass}}> {
    const app: {{=applicationClass}} = new {{=applicationClass}}(options);
    await app.boot();
    await app.start();
    process.stdout.write(`Server is running at ${app.restServer.url}\n`);
    return app;
}

if (require.main === module) {
    // the port of the workspace during development, behind traefik on every interface of its container. A start that
    // fails ends the process with its error, as every rejected promise nobody handles does
    void main({
        rest: {
            port: environment.env === 'dev' ? environment.{{=portKey}} : 3000,
            host: environment.env === 'dev' ? '127.0.0.1' : '0.0.0.0',
            // the time requests of a keep alive client get to finish when the api stops, see
            // https://www.npmjs.com/package/stoppable
            gracePeriodForClose: 5000,
            openApiSpec: {
                // useful when used with OpenAPI-to-GraphQL to locate your application
                setServersFromRequest: true
            }
        }
    });
}
