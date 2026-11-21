import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideSeoConfig } from '@service-soft/ngx-navigation/seo';

import { routes } from './app.routes';
import { locales } from './languages';
{{#tracking}}
import { provideTracking } from './tracking.provider';
{{/tracking}}
import { environment } from '../environment/environment';

export const appConfig: ApplicationConfig = {
    providers: [
        provideBrowserGlobalErrorListeners(),
        provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
        // the page the server rendered stays, rather than being rendered again in the browser
        provideClientHydration(withEventReplay()),
{{#tracking}}
        provideTracking(),
{{/tracking}}
        // what each page tells search engines and AI assistants about itself, from the data of its route: its
        // description, canonical url, structured data, the preview of a shared link and the page in the other
        // languages, in the prerendered html too. On the server, it hands server.ts the pages for the sitemap
        provideSeoConfig({ origin: environment.{{=prefix}}_base_url, locales })
    ]
};
