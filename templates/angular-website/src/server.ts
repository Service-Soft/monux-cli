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

/**
 * A page the build prerendered, as search engines and AI assistants find it.
 */
type PrerenderedPage = {
    /**
     * The path of the page, such as "/imprint".
     */
    route: string,
    /**
     * The title of the page.
     */
    title: string,
    /**
     * The description of the page.
     */
    description: string
};

const distFolder: string = join(import.meta.dirname, '..');
const browserDistFolder: string = join(distFolder, 'browser');
// a file whose name holds the hash of its content, like main-AB12CD34.js, never changes under that name
const HASHED_FILE_REGEX: RegExp = /-[\dA-Z]{8}\.[a-z\d]+$/;
{{^aiTraining}}
// crawlers that collect content to train AI models. The ones assistants and AI search fetch a page with to answer a
// question, like OAI-SearchBot, Claude-SearchBot or PerplexityBot, are not among them, so the website is still found and cited
const TRAINING_CRAWLERS: string[] = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'meta-externalagent'];
{{/aiTraining}}

const app: Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine();

/**
 * Finds every page the build prerendered, which is every page of the website that is not for a parameter.
 * @returns The pages, with their title and description as their html holds them.
 */
function findPrerenderedPages(): PrerenderedPage[] {
    // written by the build of this website, in the shape Angular gives it
    const prerendered: PrerenderedRoutes = JSON.parse(
        readFileSync(join(distFolder, 'prerendered-routes.json'), 'utf8')
    ) as PrerenderedRoutes;
    return Object.keys(prerendered.routes).map(route => {
        const html: string = readFileSync(join(browserDistFolder, route, 'index.html'), 'utf8');
        return {
            route,
            title: decodeHtml(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''),
            description: decodeHtml(/<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? '')
        };
    });
}

/**
 * Turns the characters html escapes back into text.
 * @param value - Text as html holds it.
 * @returns The text.
 */
function decodeHtml(value: string): string {
    return value
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&#39;', '\'')
        .replaceAll('&amp;', '&');
}

/**
 * Resolves the url of a page of the website.
 * @param route - The path of the page.
 * @returns The url.
 */
function resolveUrl(route: string): string {
    return `${environment.{{=prefix}}_base_url}${route === '/' ? '' : route}`;
}

// only the website in production is meant to be found, stage and local are not
app.get('/robots.txt', (_, res) => {
    const production: boolean = environment.env === 'prod';
    res.type('text/plain').send([
        'User-agent: *',
        `${production ? 'Allow' : 'Disallow'}: /`,
        '',
{{^aiTraining}}
        ...production ? [...TRAINING_CRAWLERS.map(crawler => `User-agent: ${crawler}`), 'Disallow: /', ''] : [],
{{/aiTraining}}
        `Sitemap: ${environment.{{=prefix}}_base_url}/sitemap.xml`
    ].join('\n'));
});

app.get('/sitemap.xml', (_, res) => {
    res.type('application/xml').send([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...findPrerenderedPages().map(page => `    <url><loc>${resolveUrl(page.route)}</loc></url>`),
        '</urlset>'
    ].join('\n'));
});

// what the website is and which pages it has, written for the AI assistants that read it to answer about it, see
// https://llmstxt.org
app.get('/llms.txt', (_, res) => {
    const pages: PrerenderedPage[] = findPrerenderedPages();
    const home: PrerenderedPage | undefined = pages.find(page => page.route === '/');
    res.type('text/markdown').send([
        `# ${home?.title ?? '{{=title}}'}`,
        '',
        `> ${home?.description ?? ''}`,
        '',
        '## Pages',
        '',
        ...pages.map(page => `- [${page.title}](${resolveUrl(page.route)}): ${page.description}`)
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
