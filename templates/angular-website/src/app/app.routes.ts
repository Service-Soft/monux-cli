import { inject, LOCALE_ID } from '@angular/core';
import { Routes } from '@angular/router';
import { NavigationUtilities, NavRouteData } from '@service-soft/ngx-navigation/navigation';
import { NotFoundComponent } from '@service-soft/ngx-navigation/not-found';

import { footerRows, navbarRows } from './navigation';
import { environment } from '../environment/environment';

// the routes of the navbar and the footer, then these, so the page for unknown urls stays last. Their texts are
// $localize, which "npm run i18n" collects for translation
export const routes: Routes = NavigationUtilities.resolveRoutes({
    navbarRows,
    footerRows,
    routes: [
        {
            path: '',
            title: $localize`:@@home.title:{{=title}}`,
            data: {
                description: $localize`:@@home.description:{{=title}}`,
                // what the website is, for search engines and AI assistants, in the language of the page
                structuredData: () => ({
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: '{{=title}}',
                    url: environment.{{=prefix}}_base_url,
                    inLanguage: inject(LOCALE_ID)
                })
            } satisfies NavRouteData,
            loadComponent: async () => (await import('./pages/home/home.component')).HomeComponent
        },
        // mx generate-page adds the pages without a link in the navbar or the footer above this line
        { path: '**', title: $localize`:@@notFound.title:Page not found | {{=title}}`, component: NotFoundComponent }
    ]
});
