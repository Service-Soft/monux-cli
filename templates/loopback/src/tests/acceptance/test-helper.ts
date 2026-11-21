import { Client, createRestAppClient, givenHttpServerConfig, HttpOptions } from '@loopback/testlab';

import { {{=applicationClass}} } from '../..';

/**
 * The api a test runs, and a client of it.
 */
export type AppWithClient = {
    /**
     * The running api.
     */
    app: {{=applicationClass}},
    /**
     * A client that sends requests to it.
     */
    client: Client
};

/**
 * Starts the api on a free port, as a test needs it.
 * @returns The api and a client of it.
 */
export async function setupApplication(): Promise<AppWithClient> {
    const app: {{=applicationClass}} = new {{=applicationClass}}({ rest: givenHttpServerConfig<HttpOptions>() });
    await app.boot();
    await app.start();
    return { app, client: createRestAppClient(app) };
}
