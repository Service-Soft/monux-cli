import { Routes } from '@angular/router';
import { NavigationUtilities } from '@service-soft/ngx-navigation/navigation';
import { NotFoundComponent } from '@service-soft/ngx-navigation/not-found';

import { footerRows, navbarRows } from './navigation';
import { SeoRouteData } from './seo.provider';
import { environment } from '../environment/environment';

// the routes of the navbar and the footer, then these, so the page for unknown urls stays last
export const routes: Routes = NavigationUtilities.resolveRoutes({
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
        // mx generate-page adds the pages without a link in the navbar or the footer above this line
        { path: '**', title: 'Page not found | {{=title}}', component: NotFoundComponent }
    ]
});
