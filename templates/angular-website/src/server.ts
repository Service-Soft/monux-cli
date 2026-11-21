import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

import { AngularNodeAppEngine, createNodeRequestHandler, isMainModule, writeResponseToNodeResponse } from '@angular/ssr/node';
import { SeoServerUtilities, SeoSite } from '@service-soft/ngx-navigation/seo-server';
import express, { Express } from 'express';

import { serverRoutes } from './app/app.routes.server';
import { locales } from './app/languages';
import { environment } from './environment/environment';

/**
 * The routes Angular prerendered, as it lists them next to the build.
 */
type PrerenderedRoutes = {
    /**
     * The urls of the prerendered pages, with their language, as the keys.
     */
    routes: Record<string, unknown>
};

const distFolder: string = join(import.meta.dirname, '..');
const browserDistFolder: string = join(distFolder, 'browser');
const origin: string = environment.{{=prefix}}_base_url;
// a file whose name holds the hash of its content, like main-AB12CD34.js, never changes under that name
const HASHED_FILE_REGEX: RegExp = /-[\dA-Z]{8}\.[a-z\d]+$/;
// what the build compresses, see scripts/postbuild.mjs
const CONTENT_TYPES: Record<string, string> = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
    '.json': 'application/json'
};
{{^aiTraining}}
// crawlers that collect content to train AI models. The ones assistants and AI search fetch a page with to answer a
// question, like OAI-SearchBot, Claude-SearchBot or PerplexityBot, are not among them, so the website is still found and cited
const TRAINING_CRAWLERS: string[] = ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot', 'Applebot-Extended', 'meta-externalagent'];
{{/aiTraining}}
// the build has every language below its subPath. The dev server builds one, at the root, which redirects to none
const IS_LOCALIZED_BUILD: boolean = locales.every(locale => existsSync(join(browserDistFolder, locale.subPath)));

const app: Express = express();
const angularApp: AngularNodeAppEngine = new AngularNodeAppEngine();
let site: Promise<SeoSite> | undefined;

/**
 * Finds every page of the website in every language, once while the server runs: the app hands over its routes as it
 * renders a page, and the server reads the title and description of each page from it, prerendered or rendered once.
 * @returns The pages.
 */
async function findSite(): Promise<SeoSite> {
    site ??= resolveSite();
    try {
        return await site;
    }
    catch (error) {
        // tried again on the next request
        site = undefined;
        throw error;
    }
}

/**
 * Resolves every page of the website in every language, and warns about the routes whose pages are missing.
 * @returns The pages.
 */
async function resolveSite(): Promise<SeoSite> {
    // written by the build of this website, in the shape Angular gives it
    const prerendered: PrerenderedRoutes = JSON.parse(
        readFileSync(join(distFolder, 'prerendered-routes.json'), 'utf8')
    ) as PrerenderedRoutes;
    const resolved: SeoSite = await SeoServerUtilities.resolvePages({
        origin,
        serverRoutes,
        prerenderedRoutes: Object.keys(prerendered.routes),
        appEngine: angularApp,
        locales
    });
    for (const route of resolved.unlistedRoutes) {
        process.stderr.write(`${route} is missing from the sitemap: give it data.sitemap, or prerender it with getPrerenderParams\n`);
    }
    for (const route of resolved.errorRoutes) {
        process.stderr.write(`${route} is missing from the sitemap: without a route in app.routes.server.ts, it answers 404\n`);
    }
    return resolved;
}

/**
 * Finds the file of the build a request is for: the file of its path, or the prerendered page of it.
 * @param path - The path of the request.
 * @returns The path of the file, or undefined for a path outside of the build.
 */
function findBuiltFile(path: string): string | undefined {
    const file: string = resolve(browserDistFolder, `.${path}`);
    // a path like /../server.mjs stays inside the build
    if (!file.startsWith(browserDistFolder + sep)) {
        return undefined;
    }
    return extname(file) ? file : join(file, 'index.html');
}

/**
 * Resolves how long a browser may keep a file of the build. Only what cannot go stale is cached for long. Everything
 * else, like the pages, the fonts and the favicon, is revalidated on every visit, which costs a request that answers
 * "unchanged".
 * @param file - The path of the file.
 * @returns The value of the Cache-Control header.
 */
function resolveCacheControl(file: string): string {
    return HASHED_FILE_REGEX.test(file) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

// each page has one url, so search engines index it once: without a slash at its end, and below its language. An url
// without one goes to the language the visitor prefers, the one search engines know as x-default
app.use((req, res, next) => {
    const withoutSlash: string | undefined = SeoServerUtilities.findTrailingSlashRedirect(req.originalUrl);
    if (withoutSlash != undefined) {
        res.redirect(301, withoutSlash);
        return;
    }
    const localized: string | undefined = IS_LOCALIZED_BUILD
        ? SeoServerUtilities.findLocaleRedirect(req.originalUrl, req.get('Accept-Language'), locales)
        : undefined;
    if (localized != undefined) {
        res.vary('Accept-Language');
        res.redirect(302, localized);
        return;
    }
    next();
});

// stage is the one environment that is reachable from the internet without being the website. Dev and local are only
// reachable on the machine of the developer, where they behave like production, so its search engine rating can be checked
app.get('/robots.txt', (_, res) => {
    res.type('text/plain').send(SeoServerUtilities.resolveRobotsTxt({
        allowed: environment.env !== 'stage',
{{#aiTraining}}
        disallowedCrawlers: [],
{{/aiTraining}}
{{^aiTraining}}
        disallowedCrawlers: TRAINING_CRAWLERS,
{{/aiTraining}}
        sitemapUrl: `${origin}/sitemap.xml`
    }));
});

// every page in every language, however it renders, linked to itself in the other languages. Over 50,000 urls an
// index of parts
app.get(/^\/sitemap(-\d+)?\.xml$/, async (req, res, next) => {
    const file: string | undefined = SeoServerUtilities.resolveSitemapFiles((await findSite()).pages, origin)[req.path];
    if (file == undefined) {
        next();
        return;
    }
    res.type('application/xml').send(file);
});

// what the website is and which pages it has, written for the AI assistants that read it to answer about it, see
// https://llmstxt.org: /llms.txt in the language the website is written in, /<subPath>/llms.txt in each other
for (const locale of locales) {
    app.get(locale === locales[0] ? '/llms.txt' : `/${locale.subPath}/llms.txt`, async (_, res) => {
        res.type('text/markdown').send(SeoServerUtilities.resolveLlmsTxt((await findSite()).pages, locale, locales, origin));
    });
}

// the files and prerendered pages the build compressed, in the compression the browser takes. Traefik leaves a response
// that is compressed already as it is
app.use((req, res, next) => {
    const encoding: string | false = req.acceptsEncodings('br', 'gzip');
    const file: string | undefined = findBuiltFile(req.path);
    const compressed: string | undefined = encoding !== false && file != undefined
        ? `${file}.${encoding === 'br' ? 'br' : 'gz'}`
        : undefined;
    if (req.method !== 'GET' || compressed == undefined || !existsSync(compressed) || file == undefined) {
        next();
        return;
    }
    res.sendFile(compressed, {
        headers: {
            'Content-Encoding': encoding,
            'Content-Type': CONTENT_TYPES[extname(file)],
            'Cache-Control': resolveCacheControl(file),
            'Vary': 'Accept-Encoding'
        }
    });
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
    process.stdout.write(`Listening on http://localhost:${port}\n`);
}

/**
 * Request handler used by the Angular CLI, for the dev server and during the build.
 */
export const reqHandler: ReturnType<typeof createNodeRequestHandler> = createNodeRequestHandler(app);
