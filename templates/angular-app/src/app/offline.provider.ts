import { EnvironmentProviders, inject, isDevMode, makeEnvironmentProviders } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';
import { provideOfflineEntities } from '@service-soft/ngx-entity/offline';
import { provideOfflineConfig } from '@service-soft/ngx-pwa/offline';
import { provideOfflineCache } from '@service-soft/ngx-pwa/offline-cache';
import { provideUpdates } from '@service-soft/ngx-pwa/updates';

import { AppAuthService } from './app-auth.service';
import { environment } from '../environment/environment';

/**
 * What lets the app work without a connection, together with the interceptors and the logout of app.config.ts.
 * The service worker keeps the files of the app on the device, so it opens offline, and asks the user to reload once it
 * has downloaded a new version. Its files are listed in ngsw-config.json.
 * What the app read from the api last is shown while offline, never while online, and only to the user who read it, in
 * the tenant they read it in. The offline status bar says how old it is.
 * Changes of entities made offline are kept on the device with their user and their tenant, shown in the tables, and
 * synced from the sync dialog, each in the tenant it was made in.
 * @returns The providers to add to the application config.
 */
export function provideOffline(): EnvironmentProviders {
    return makeEnvironmentProviders([
        // not while developing, where it would keep the files of the last build
        provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' }),
        provideUpdates(),
        // whose data a cached answer or a kept change is, and the tenant it belongs to
        provideOfflineConfig({
            headers: { 'x-tenant-id': () => inject(AppAuthService).activeTenantId() },
            scope: () => inject(AppAuthService).authData()?.userId
        }),
        // kept for 7 days, the default
        provideOfflineCache({ urls: [environment.{{=apiPrefix}}_base_url] }),
        provideOfflineEntities()
    ]);
}
