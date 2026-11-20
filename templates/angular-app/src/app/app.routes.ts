import { Routes } from '@angular/router';
import { NavigationUtilities } from '@service-soft/ngx-navigation/navigation';
import { NotFoundComponent } from '@service-soft/ngx-navigation/not-found';

import { navbarRows } from './navigation';

// the routes of the navbar, then these, so the page for unknown urls stays last. Every page renders in the browser,
// see app.routes.server.ts
export const routes: Routes = [
    // the start of the app, where a login ends up. Outside of resolveRoutes, which keeps only one route of each path
    { path: '', pathMatch: 'full', redirectTo: 'account' },
    ...NavigationUtilities.resolveRoutes({
        navbarRows,
        routes: [
            // logging in and resetting a password
            { path: '', loadChildren: async () => (await import('./auth.routes')).authRoutes },
            { path: '**', title: 'Page not found | {{=title}}', component: NotFoundComponent }
        ]
    })
];
