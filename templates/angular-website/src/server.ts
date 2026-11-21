/*
 * TODO: sitemap.xml, robots.txt and llms.txt from the routes, in every language, once @service-soft/ngx-navigation has
 * them. Until then this file builds them from the prerendered pages only: a page rendered on the server or in the
 * browser, a page with parameters and every language but the first are missing, and /imprint/ answers like /imprint.
 * Angular i18n builds one server.mjs for every language, next to a main.server.mjs and the browser files of each below
 * dist/<name>/server/<code> and browser/<code>, and prerenders every page below /<code>/. So this file reads the
 * structure of the website from its routes, and what a page says in a language from the page as that language
 * renders it.
 *
 * What ngx-navigation needs for it:
 *
 * 1. @service-soft/ngx-navigation/seo-server, for the server.ts of a website: node only, express or not.
 *    - resolvePages({ routes, serverRoutes, distFolder, appEngine, origin, locales }) finds every url of the website
 *      that search engines may index, in every locale:
 *      - the paths of the router config, its children and its loadChildren included, without redirects, without '**'
 *        and without routes whose data.robots holds noindex. Each with the render mode of its ServerRoute
 *      - a path with parameters gets the urls Angular prerendered for it (prerendered-routes.json), or the paths its
 *        data.sitemap answers, for any render mode, like the products of an api. Without either it is left out, and
 *        named in a warning when the server starts
 *      - in each locale, the url below its subPath, and the title and description the page renders in it: from the
 *        prerendered html, or rendered once through the app engine for RenderMode.Server and kept while the server
 *        runs. A RenderMode.Client page has neither, as only a browser renders it
 *      - lastModified from data.lastModified, or from the entries of data.sitemap. None without, as Google only reads
 *        a lastmod that is always right. No changefreq and no priority, which Google ignores
 *    - resolveSitemap(pages): one <url> per page and locale, with an xhtml:link rel="alternate" hreflang for every
 *      locale of the page and hreflang="x-default" for its url without a locale, which redirects by the language of the
 *      visitor. Absolute https urls, escaped for xml, a <lastmod> when known. Over 50,000 urls or 50 MB a sitemap index
 *      with one sitemap per part
 *    - resolveRobotsTxt({ allowed, disallowedCrawlers, sitemapUrl }), like the robots.txt below
 *    - resolveLlmsTxt(pages, locale): /llms.txt in the source locale and /<code>/llms.txt in each other, listing the
 *      pages that render on the server, see https://llmstxt.org
 *    - resolvePreferredLocale(acceptLanguage, locales): the locale an url without one redirects to, the source locale
 *      when none matches. The redirect is a 302 with Vary: Accept-Language, so search engines index the locales
 *    - a handler that answers an url with a trailing slash with a 301 to the one without, the query kept, so each page
 *      has one url
 * 2. SeoService of @service-soft/ngx-navigation/seo, with locales in provideSeoConfig, each with its code and subPath:
 *    - <link rel="alternate" hreflang> on every page, absolute, for each locale and for x-default, which a navigation
 *      writes like the canonical url
 *    - the canonical url of a page in its own locale, without query, hash and trailing slash
 *    - og:locale, and og:locale:alternate for the other locales
 * 3. NavRouteData: sitemap?: () => Promise<NavSitemapEntry[]>, the paths of a route with parameters without a locale,
 *    each with an optional lastModified, and lastModified?: string, the date of a page as an ISO date
 *
 * Tested in angular-libraries with a router config of every render mode, parameters with and without data.sitemap,
 * noindex, lazy children and two locales, and by the showcase: its prerendered pages hold the alternates, and its
 * sitemap lists every page in both locales.
 */
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

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

/**
 * Resolves the url of a page of the website.
 * @param route - The path of the page.
 * @returns The url.
 */
function resolveUrl(route: string): string {
    return `${environment.{{=prefix}}_base_url}${route === '/' ? '' : route}`;
}

// stage is the one environment that is reachable from the internet without being the website. Dev and local are only
// reachable on the machine of the developer, where they behave like production, so its search engine rating can be checked
app.get('/robots.txt', (_, res) => {
    res.type('text/plain').send([
        'User-agent: *',
        `${environment.env === 'stage' ? 'Disallow' : 'Allow'}: /`,
        '',
{{^aiTraining}}
        ...TRAINING_CRAWLERS.map(crawler => `User-agent: ${crawler}`),
        'Disallow: /',
        '',
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
