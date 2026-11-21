import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, inject } from '@angular/core';
import { provideRouter } from '@angular/router';
import { authInterceptor, provideAuth } from '@service-soft/ngx-auth/auth';
import { showDialogErrorHandler } from '@service-soft/ngx-error-handling/error-dialog';
import { provideErrorHandler } from '@service-soft/ngx-error-handling/error-handler';
import { logErrorHandler, provideLoggerConfig } from '@service-soft/ngx-persistence-logger/logger';
import { offlineInterceptor } from '@service-soft/ngx-pwa/offline';
import { offlineCacheInterceptor, OfflineCacheService } from '@service-soft/ngx-pwa/offline-cache';
import { syncBeforeLogout } from '@service-soft/ngx-pwa/sync-before-logout';
import { ApiRoute, LogApplication } from '{{=contractPackage}}';

import { AppAuthService } from './app-auth.service';
import { routes } from './app.routes';
import { provideAppNavigation } from './navigation';
import { provideOffline } from './offline.provider';
import { environment } from '../environment/environment';

const API_URL: string = environment.{{=apiPrefix}}_base_url;

export const appConfig: ApplicationConfig = {
    providers: [
        provideRouter(routes),
        provideAppNavigation(),
        // the ones of the offline support after the auth, so that what they keep and send has the login of the user
        provideHttpClient(withInterceptors([authInterceptor, offlineCacheInterceptor, offlineInterceptor])),
        // tokens, as zibri issues them to the app on another origin, see the AppAuthController of the api
        provideAuth(AppAuthService, {
            apiUrl: `${API_URL}/${ApiRoute.AUTH}`,
            strategy: 'jwt',
            // what asks for the second factor a route of the api wants, loaded only then
            secondFactorPrompt: async () => (await import('@service-soft/ngx-auth/two-factor')).TwoFactorDialogPrompt,
            // the changes made offline are synced or discarded first, and nothing the user read stays on the device
            beforeLogout: syncBeforeLogout,
            onLogout: () => inject(OfflineCacheService).clearCache()
        }),
        // the errors of the app go to the logs of the api, which knows it by this name
        provideLoggerConfig({ logUrl: `${API_URL}/${ApiRoute.LOGS}`, application: LogApplication.{{=logApplication}} }),
        // every error nothing caught is logged, and shown to the user with what zibri says about it
        provideErrorHandler(logErrorHandler(), showDialogErrorHandler()),
        provideOffline()
    ]
};
