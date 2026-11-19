import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import express, { Express } from 'express';

import { environment } from './environment/environment';

/**
 * The routes Angular prerendered, as it lists them next to the build.
 */
type PrerenderedRoutes = {
    // eslint-disable-next-line jsdoc/require-jsdoc
    routes: Record<string, unknown>
};

const browserDistFolder: string = join(import.meta.dirname, '../browser');
// a file whose name holds the hash of its content, like main-AB12CD34.js, never changes under that name
const HASHED_FILE_REGEX: RegExp = /-[\dA-Z]{8}\.[a-z\d]+$/;

const app: Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine();

// only the website in production is meant to be found, stage and local are not
app.get('/robots.txt', (_, res) => {
    res.type('text/plain').send([
        'User-agent: *',
        `${environment.env === 'prod' ? 'Allow' : 'Disallow'}: /`,
        '',
        `Sitemap: ${environment.{{=prefix}}_base_url}/sitemap.xml`
    ].join('\n'));
});

// every page the build prerendered, which is every page of the website that is not for a parameter
app.get('/sitemap.xml', (_, res) => {
    const prerendered: PrerenderedRoutes = JSON.parse(
        readFileSync(join(import.meta.dirname, '../prerendered-routes.json'), 'utf8')
    ) as PrerenderedRoutes;
    const urls: string[] = Object.keys(prerendered.routes)
        .map(route => `    <url><loc>${environment.{{=prefix}}_base_url}${route === '/' ? '' : route}</loc></url>`);
    res.type('application/xml').send([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...urls,
        '</urlset>'
    ].join('\n'));
});

app.use(
    express.static(browserDistFolder, {
        index: false,
        redirect: false,
        // only what cannot go stale is cached for long. Everything else, like the fonts and the favicon, is revalidated
        // on every visit, which costs a request that answers "unchanged"
        setHeaders: (res, path) => {
            res.setHeader('Cache-Control', HASHED_FILE_REGEX.test(path) ? 'public, max-age=31536000, immutable' : 'no-cache');
        }
    })
);

// every request that is no file: a page, rendered when the website was built or now. Express hands a rejection to next
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
