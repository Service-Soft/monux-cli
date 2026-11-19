/*
 * TODO: replace this file with the SEO of @service-soft/ngx-navigation, once it has one. What it is to do:
 *
 * Every page needs, next to its title from the `title` of its route:
 * | Tag                                   | From                                                                   |
 * |---------------------------------------|------------------------------------------------------------------------|
 * | <meta name="description">             | `data.description` of the deepest route that has one                   |
 * | <link rel="canonical">                | a configured origin + the path of the url, without query and fragment  |
 * | <script type="application/ld+json">   | `data.structuredData`, an object or a function of the route            |
 * | <meta name="robots">                  | `data.robots`, such as 'noindex' for a thank-you page                  |
 * | og:title, og:description, og:url,     | the title, the description, the canonical url and `data.image`, so a   |
 * | og:image                              | shared link and an AI assistant citing the page show a preview         |
 *
 * - `provideSeoConfig({ origin, defaultImage? })` in its own entry point, like `@service-soft/ngx-navigation/seo`, so an
 *   app that does not use it ships none of it. `NavRouteData` gets typed `description`, `structuredData`, `robots`, `image`.
 * - The tags are written on every NavigationEnd, on the server too, so the prerendered html holds them: search engines
 *   and AI crawlers mostly read the html as it comes, without running its scripts. No tag of the previous page survives
 *   a navigation in the browser.
 * - Tests the library needs: a prerendered page of a route with a description and structured data holds both, its
 *   canonical url has no query; navigating from a page with structured data to one without removes the script.
 *
 * Then: provideSeo() in app.config.ts becomes provideSeoConfig(...), and SeoRouteData becomes NavRouteData.
 */
import { DOCUMENT } from '@angular/common';
import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../environment/environment';

/**
 * What a page tells search engines and AI assistants about itself, next to its title.
 */
export type SeoRouteData = {
    /**
     * The text search engines show below the title of the page, and assistants read to know what is on it. One or two
     * sentences.
     */
    description: string,
    /**
     * What the page is, for machines, as https://schema.org describes it, such as a WebSite, an Organization or a Product.
     */
    structuredData?: Record<string, unknown>
};

/**
 * Sets the description, the canonical url and the structured data of every page from the data of its route, on the
 * server too, so the prerendered html holds them.
 * @returns The providers to add to the application config.
 */
export function provideSeo(): EnvironmentProviders {
    return provideAppInitializer(() => {
        const router: Router = inject(Router);
        const meta: Meta = inject(Meta);
        const document: Document = inject(DOCUMENT);
        router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            const data: Partial<SeoRouteData> = findDeepestData(router.routerState.snapshot.root);
            if (data.description != undefined) {
                meta.updateTag({ name: 'description', content: data.description });
            }
            setCanonicalUrl(document, `${environment.{{=prefix}}_base_url}${router.url.split(/[#?]/)[0]}`);
            setStructuredData(document, data.structuredData);
        });
    });
}

/**
 * Finds the data of the page that is shown, each field from the deepest route that has it.
 * @param route - The root of the current routes.
 * @returns The data.
 */
function findDeepestData(route: ActivatedRouteSnapshot): Partial<SeoRouteData> {
    let data: Partial<SeoRouteData> = {};
    for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
        const routeData: Partial<SeoRouteData> = current.data;
        data = { ...data, ...routeData };
    }
    return data;
}

/**
 * Sets the canonical url of the page, which tells search engines the one address of it, whatever query it was opened with.
 * @param document - The document of the page.
 * @param url - The canonical url.
 */
function setCanonicalUrl(document: Document, url: string): void {
    let link: HTMLLinkElement | null = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        // appendChild rather than append, which the document of the server does not know
        // eslint-disable-next-line unicorn/prefer-dom-node-append
        document.head.appendChild(link);
    }
    link.setAttribute('href', url);
}

/**
 * Sets the structured data of the page, or removes the one of the page before when this one has none.
 * @param document - The document of the page.
 * @param structuredData - The structured data of the page.
 */
function setStructuredData(document: Document, structuredData: Record<string, unknown> | undefined): void {
    const previous: HTMLScriptElement | null = document.head.querySelector('script[type="application/ld+json"]');
    if (previous) {
        // removeChild rather than remove, like appendChild above
        // eslint-disable-next-line unicorn/prefer-dom-node-remove
        document.head.removeChild(previous);
    }
    if (structuredData == undefined) {
        return;
    }
    const script: HTMLScriptElement = document.createElement('script');
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(structuredData);
    // eslint-disable-next-line unicorn/prefer-dom-node-append
    document.head.appendChild(script);
}
