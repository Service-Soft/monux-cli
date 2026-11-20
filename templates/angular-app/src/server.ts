import { join } from 'node:path';

import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { Express } from 'express';

const browserDistFolder: string = join(import.meta.dirname, '..', 'browser');
// a file whose name holds the hash of its content, like main-AB12CD34.js, never changes under that name
const HASHED_FILE_REGEX: RegExp = /-[\dA-Z]{8}\.[a-z\d]+$/;

const app: Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine();

/**
 * Resolves how long a browser may keep a file of the build. Only what cannot go stale is cached for long. Everything
 * else, like the page, the service worker and its list of files, is revalidated on every visit, so an update reaches
 * the users as soon as it is deployed.
 * @param file - The path of the file.
 * @returns The value of the Cache-Control header.
 */
function resolveCacheControl(file: string): string {
    return HASHED_FILE_REGEX.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

// the app is for the people who log in to it, so search engines have nothing to find in it
app.get('/robots.txt', (_, res) => {
    res.type('text/plain').send(['User-agent: *', 'Disallow: /'].join('\n'));
});

app.use(
    express.static(browserDistFolder, {
        index: false,
        redirect: false,
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', resolveCacheControl(path));
        }
    })
);

// every request that is no file: the page, which the browser renders, as only it knows who is logged in. Express hands
// a rejection to next
app.use(async (req, res, next) => {
    const response: Response | null = await angularApp.handle(req);
    if (response) {
        await writeResponseToNodeResponse(response, res);
        return;
    }
    next();
});

if (isMainModule(import.meta.url)) {
    const port: string = process.env['PORT'] ?? '4000';
    // a port that is taken ends the process, which is what a container should do then
    app.listen(port);
    // eslint-disable-next-line no-console
    console.log(`Listening on http://localhost:${port}`);
}

/**
 * Request handler used by the Angular CLI, for the dev server and during the build.
 */
export const reqHandler: ReturnType<typeof createNodeRequestHandler> = createNodeRequestHandler(app);
