{{#multilingual}}
import { LanguageSwitcherComponent } from '@service-soft/ngx-navigation/language-switcher';
{{/multilingual}}
import { FooterRow, NavbarRow, NavRouteData } from '@service-soft/ngx-navigation/navigation';
{{#multilingual}}

import { languages } from './languages';
{{/multilingual}}

// what the website shows in its navbar and its footer. A link with a whole route also adds that route to the router,
// see app.routes.ts. "mx generate-page" adds the pages it generates above the comments that say so. The texts are
// $localize, which "npm run i18n" collects for translation
export const navbarRows: NavbarRow[] = [
    {
        elements: [
{{#multilingual}}
            // the page in the other languages, at the end of the navbar
            { type: 'custom', component: LanguageSwitcherComponent, inputs: { languages }, position: 'end', collapse: 'never' },
{{/multilingual}}
            { type: 'title', title: '{{=title}}', link: { route: '' }, collapse: 'never' }
            // mx generate-page adds the links of the navbar above this line
        ]
    }
];

export const footerRows: FooterRow[] = [
    {
        elements: [
            { type: 'text', text: '© {{=title}}' },
            {
                type: 'link',
                name: $localize`:@@imprint.link:Imprint`,
                position: 'end',
                route: {
                    path: 'imprint',
                    title: $localize`:@@imprint.title:Imprint | {{=title}}`,
                    data: { description: $localize`:@@imprint.description:Who runs {{=title}}, and how to reach them.` } satisfies NavRouteData,
                    loadComponent: async () => (await import('./pages/imprint/imprint.component')).ImprintComponent
                }
            },
            {
                type: 'link',
                name: $localize`:@@privacy.link:Privacy`,
                position: 'end',
                route: {
                    path: 'privacy',
                    title: $localize`:@@privacy.title:Privacy | {{=title}}`,
                    data: { description: $localize`:@@privacy.description:What {{=title}} does with your data.` } satisfies NavRouteData,
                    loadComponent: async () => (await import('./pages/privacy/privacy.component')).PrivacyComponent
                }
            }
            // mx generate-page adds the links of the footer above this line
        ]
    }
];
