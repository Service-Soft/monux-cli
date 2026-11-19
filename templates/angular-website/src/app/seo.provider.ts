import { DOCUMENT } from '@angular/common';
import { EnvironmentProviders, inject, provideAppInitializer } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { environment } from '../environment/environment';

/**
 * What a page tells search engines about itself, next to its title.
 */
export type SeoRouteData = {
    /**
     * The text search engines show below the title of the page, one or two sentences about what is on it.
     */
    description: string
};

/**
 * Sets the description and the canonical url of every page from the data of its route, on the server too, so the
 * prerendered html holds them.
 * TODO: replace with the one of @service-soft/ngx-navigation once it sets them, and remove this file.
 * @returns The providers to add to the application config.
 */
export function provideSeo(): EnvironmentProviders {
    return provideAppInitializer(() => {
        const router: Router = inject(Router);
        const meta: Meta = inject(Meta);
        const document: Document = inject(DOCUMENT);
        router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
            const description: string | undefined = findDescription(router.routerState.snapshot.root);
            if (description != undefined) {
                meta.updateTag({ name: 'description', content: description });
            }
            setCanonicalUrl(document, `${environment.{{=prefix}}_base_url}${router.url.split(/[#?]/)[0]}`);
        });
    });
}

/**
 * Finds the description of the page that is shown, the one of the deepest route that has one.
 * @param route - The root of the current routes.
 * @returns The description, or undefined when no route has one.
 */
function findDescription(route: ActivatedRouteSnapshot): string | undefined {
    let description: string | undefined;
    for (let current: ActivatedRouteSnapshot | null = route; current; current = current.firstChild) {
        const data: Partial<SeoRouteData> = current.data;
        description = data.description ?? description;
    }
    return description;
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
