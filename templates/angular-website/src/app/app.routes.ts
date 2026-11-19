import { Routes } from '@angular/router';
import { NavigationUtilities } from '@service-soft/ngx-navigation/navigation';
import { NotFoundComponent } from '@service-soft/ngx-navigation/not-found';
{{#tracking}}
import { consentGuard } from '@service-soft/ngx-tracking/consent';
{{/tracking}}

import { footerRows, navbarRows } from './navigation';
import { SeoRouteData } from './seo.provider';
import { environment } from '../environment/environment';

// the routes of the navbar and the footer, then these, so the page for unknown urls stays last
export const pages: Routes = NavigationUtilities.resolveRoutes({
    navbarRows,
    footerRows,
    routes: [
        {
            path: '',
            title: '{{=title}}',
            data: {
                description: '{{=title}}',
                // what the website is, for search engines and AI assistants
                structuredData: {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: '{{=title}}',
                    url: environment.{{=prefix}}_base_url,
                    inLanguage: '{{=language}}'
                }
            } satisfies SeoRouteData,
            loadComponent: async () => (await import('./pages/home/home.component')).HomeComponent
        },
        { path: '**', title: 'Page not found | {{=title}}', component: NotFoundComponent }
    ]
});

{{#tracking}}
// asks for consent on the first visit, whichever page it starts on. It never blocks the navigation
export const routes: Routes = pages.map(route => ({ ...route, canActivate: [...route.canActivate ?? [], consentGuard] }));
{{/tracking}}
{{^tracking}}
export const routes: Routes = pages;
{{/tracking}}
