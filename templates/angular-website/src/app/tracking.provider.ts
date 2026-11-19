{{#tracking}}
/*
 * TODO: replace the asking below with the option of @service-soft/ngx-tracking, once it has one. What it is to do:
 *
 * provideTrackingConsent({ ..., askOn: 'navigation' | 'interaction' }), 'navigation' being what consentGuard does now.
 * With 'interaction', ConsentService.requestChoices() runs on the first click, tap, key, scroll, wheel or mouse move on
 * the document, once, and only in the browser:
 * - the visitor sees the page first, and still has to decide before doing anything with it
 * - nothing of the dialog is in the prerendered html, so no visitor who already chose sees it flicker
 * - the dialog is no longer the largest contentful paint of the page: it opened late, after hydration and its lazy
 *   chunk, and was rated as the page loading slowly. Moving the mouse does not end the measurement of the LCP in
 *   Chrome, but it opens the dialog within the first second on a desktop
 * - the code of the dialog stays lazy, loaded with the dynamic import of `ui` as now, or with @defer inside the library
 * Tests the library needs: no dialog before an interaction, the dialog after the first one, none after a choice was
 * stored, nothing on the server.
 *
 * Then: askOn: 'interaction' in provideTrackingConsent below, and askOnFirstInteraction() goes.
 */
import { isPlatformBrowser } from '@angular/common';
import { EnvironmentProviders, inject, makeEnvironmentProviders, PLATFORM_ID, provideAppInitializer } from '@angular/core';
import { ConsentService, provideTrackingConsent } from '@service-soft/ngx-tracking/consent';
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

// what counts as the visitor doing something with the page
const INTERACTIONS: (keyof DocumentEventMap)[] = ['pointerdown', 'keydown', 'touchstart', 'scroll', 'wheel', 'mousemove'];

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
            // loaded only when it shows
            ui: async () => (await import('@service-soft/ngx-tracking/consent-dialog')).ConsentDialogUi
        }),
        askOnFirstInteraction(),
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

/**
 * Asks the visitor which trackings they allow on their first interaction with the page, unless they chose already.
 * @returns The provider that listens for the interaction.
 */
function askOnFirstInteraction(): EnvironmentProviders {
    return provideAppInitializer(() => {
        if (!isPlatformBrowser(inject(PLATFORM_ID))) {
            return;
        }
        const consentService: ConsentService = inject(ConsentService);
        const firstInteraction: AbortController = new AbortController();
        for (const interaction of INTERACTIONS) {
            document.addEventListener(
                interaction,
                () => {
                    firstInteraction.abort();
                    void consentService.requestChoices();
                },
                { once: true, passive: true, signal: firstInteraction.signal }
            );
        }
    });
}
{{/tracking}}
