{{#tracking}}
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideTrackingConsent } from '@service-soft/ngx-tracking/consent';
{{#googleAnalytics}}
import { GoogleAnalyticsService, provideGoogleAnalytics } from '@service-soft/ngx-tracking/google-analytics';
{{/googleAnalytics}}
{{#googleTagManager}}
import { GoogleTagManagerService, provideGoogleTagManager } from '@service-soft/ngx-tracking/google-tag-manager';
{{/googleTagManager}}
{{#metaPixel}}
import { MetaPixelService, provideMetaPixel } from '@service-soft/ngx-tracking/meta-pixel';
{{/metaPixel}}

import { environment } from '../environment/environment';

/**
 * The trackings of the website. None of them loads or sends anything before a visitor allowed it in the consent dialog,
 * which asks on their first interaction with the page. The ids are in the .env.public of the workspace.
 * @returns The providers to add to the application config.
 */
export function provideTracking(): EnvironmentProviders {
    return makeEnvironmentProviders([
        provideTrackingConsent({
            trackings: [
{{#googleAnalytics}}
                {
                    name: 'Google Analytics',
                    description: ['Counts the visits of the pages. Shared with Google.'],
                    service: GoogleAnalyticsService
                },
{{/googleAnalytics}}
{{#googleTagManager}}
                {
                    name: 'Google Tag Manager',
                    description: ['Loads the tags of Google. Shared with Google.'],
                    service: GoogleTagManagerService
                },
{{/googleTagManager}}
{{#metaPixel}}
                {
                    name: 'Meta Pixel',
                    description: ['Measures the ads of the website. Shared with Meta.'],
                    service: MetaPixelService
                },
{{/metaPixel}}
            ],
            // the visitor sees the page first, and decides before doing anything with it: a click, a key, a scroll or a
            // move of the mouse. The dialog is no part of the prerendered page, so nobody who chose sees it flicker
            askOn: 'interaction',
            // loaded only when it shows
            ui: async () => (await import('@service-soft/ngx-tracking/consent-dialog')).ConsentDialogUi
        }),
{{#googleAnalytics}}
        provideGoogleAnalytics({ measurementId: environment.{{=prefix}}_google_analytics_id }),
{{/googleAnalytics}}
{{#googleTagManager}}
        provideGoogleTagManager({ containerId: environment.{{=prefix}}_google_tag_manager_id }),
{{/googleTagManager}}
{{#metaPixel}}
        provideMetaPixel({ pixelId: environment.{{=prefix}}_meta_pixel_id }),
{{/metaPixel}}
    ]);
}
{{/tracking}}
