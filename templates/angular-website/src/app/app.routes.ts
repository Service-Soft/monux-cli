import { Routes } from '@angular/router';
import { NavigationUtilities } from '@service-soft/ngx-navigation/navigation';
import { NotFoundComponent } from '@service-soft/ngx-navigation/not-found';

import { footerRows, navbarRows } from './navigation';
import { SeoRouteData } from './seo.provider';

// the routes of the navbar and the footer, then these, so the page for unknown urls stays last
export const routes: Routes = NavigationUtilities.resolveRoutes({
    navbarRows,
    footerRows,
    routes: [
        {
            path: '',
            title: '{{=title}}',
            data: { description: '{{=title}}' } satisfies SeoRouteData,
            loadComponent: async () => (await import('./pages/home/home.component')).HomeComponent
        },
        { path: '**', title: 'Page not found | {{=title}}', component: NotFoundComponent }
    ]
});
