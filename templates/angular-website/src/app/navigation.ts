import { FooterRow, NavbarRow } from '@service-soft/ngx-navigation/navigation';

import { SeoRouteData } from './seo.provider';

// what the website shows in its navbar and its footer. A link with a whole route also adds that route to the router,
// see app.routes.ts. "mx generate-page" adds the pages it generates here
export const navbarRows: NavbarRow[] = [
    {
        elements: [
            { type: 'title', title: '{{=title}}', link: { route: '' }, collapse: 'never' }
        ]
    }
];

export const footerRows: FooterRow[] = [
    {
        elements: [
            { type: 'text', text: '© {{=title}}' },
            {
                type: 'link',
                name: 'Imprint',
                position: 'end',
                route: {
                    path: 'imprint',
                    title: 'Imprint | {{=title}}',
                    data: { description: 'Who runs {{=title}}, and how to reach them.' } satisfies SeoRouteData,
                    loadComponent: async () => (await import('./pages/imprint/imprint.component')).ImprintComponent
                }
            },
            {
                type: 'link',
                name: 'Privacy',
                position: 'end',
                route: {
                    path: 'privacy',
                    title: 'Privacy | {{=title}}',
                    data: { description: 'What {{=title}} does with your data.' } satisfies SeoRouteData,
                    loadComponent: async () => (await import('./pages/privacy/privacy.component')).PrivacyComponent
                }
            }
        ]
    }
];
