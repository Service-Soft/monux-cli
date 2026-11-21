import { beforeEach, describe, expect, test } from '@jest/globals';

import { getMockConstants, MockConstants } from '../__testing__';
import { CPUtilities, FsUtilities, JsonUtilities, Path, PathUtilities } from '../encapsulation';

const mockConstants: MockConstants = getMockConstants('website-translations');
const websitePath: Path = PathUtilities.resolve(mockConstants.PROJECT_DIR, 'website');
const translationPath: Path = PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.de.xlf');

// what "npm run i18n" runs after ng extract-i18n, as the template of the website and the app has it
const SCRIPT: Path = PathUtilities.resolve(__dirname, '..', '..', 'templates', 'angular', 'scripts', 'translations.mjs');

// a unit as ng extract-i18n writes it
function unit(id: string, source: string, target?: string, sourceFile: string = 'src/app/navigation.ts'): string {
    return [
        `      <trans-unit id="${id}" datatype="html">`,
        `        <source>${source}</source>`,
        ...target == undefined ? [] : [`        ${target}`],
        '        <context-group purpose="location">',
        `          <context context-type="sourcefile">${sourceFile}</context>`,
        '        </context-group>',
        '      </trans-unit>'
    ].join('\n');
}

function xliff(units: string[], targetLanguage?: string): string {
    const target: string = targetLanguage == undefined ? '' : ` target-language="${targetLanguage}"`;
    return [
        '<?xml version="1.0" encoding="UTF-8" ?>',
        '<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">',
        `  <file source-language="en"${target} datatype="plaintext" original="ng2.template">`,
        '    <body>',
        ...units,
        '    </body>',
        '  </file>',
        '</xliff>'
    ].join('\n');
}

describe('translations.mjs of the angular template', () => {
    beforeEach(async () => {
        await FsUtilities.rm(websitePath);
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'scripts', 'translations.mjs'), await FsUtilities.readFile(SCRIPT));
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'angular.json'), JsonUtilities.stringify({
            projects: {
                website: {
                    i18n: {
                        sourceLocale: { code: 'en', subPath: 'en' },
                        locales: { de: { translation: 'src/locale/messages.de.xlf', subPath: 'de' } }
                    }
                }
            }
        }));
    });

    test('keeps what is translated, gives a new text its source and marks a changed one for review', async () => {
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.xlf'), xliff([
            unit('imprint.link', 'Imprint'),
            unit('privacy.link', 'Privacy policy'),
            unit('about-us.link', 'About $5 us')
        ]));
        // translated before the website changed: the privacy link had another text, and the shop is gone
        await FsUtilities.createFile(translationPath, xliff([
            unit('imprint.link', 'Imprint', '<target state="translated">Impressum</target>'),
            unit('privacy.link', 'Privacy', '<target state="translated">Datenschutz</target>'),
            unit('shop.link', 'Shop', '<target state="translated">Laden</target>')
        ], 'de'));

        await CPUtilities.exec(`cd ${websitePath} && node scripts/translations.mjs`);

        expect(await FsUtilities.readFile(translationPath)).toBe(xliff([
            unit('imprint.link', 'Imprint', '<target state="translated">Impressum</target>'),
            unit('privacy.link', 'Privacy policy', '<target state="needs-review-translation">Datenschutz</target>'),
            // a $ in a text stays as it is
            unit('about-us.link', 'About $5 us', '<target state="new">About $5 us</target>')
        ], 'de'));
    });

    test('creates the translation of a language that has none yet', async () => {
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.xlf'), xliff([unit('imprint.link', 'Imprint')]));

        await CPUtilities.exec(`cd ${websitePath} && node scripts/translations.mjs`);

        expect(await FsUtilities.readFile(translationPath))
            .toBe(xliff([unit('imprint.link', 'Imprint', '<target state="new">Imprint</target>')], 'de'));
    });

    test('adds the texts index.html marks for translation, which ng extract-i18n leaves out, once', async () => {
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'src', 'index.html'), [
            '<body>',
            '    <app-root></app-root>',
            '    <noscript class="text-body" i18n="@@index.noscript">Admin needs JavaScript.</noscript>',
            '</body>'
        ]);
        await FsUtilities.createFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.xlf'), xliff([unit('imprint.link', 'Imprint')]));

        await CPUtilities.exec(`cd ${websitePath} && node scripts/translations.mjs`);
        // like after a change of only the translations, without ng extract-i18n
        await CPUtilities.exec(`cd ${websitePath} && node scripts/translations.mjs`);

        const noscript: string = unit('index.noscript', 'Admin needs JavaScript.', undefined, 'src/index.html');
        expect(await FsUtilities.readFile(PathUtilities.resolve(websitePath, 'src', 'locale', 'messages.xlf')))
            .toBe(xliff([unit('imprint.link', 'Imprint'), noscript]));
        expect(await FsUtilities.readFile(translationPath)).toBe(xliff([
            unit('imprint.link', 'Imprint', '<target state="new">Imprint</target>'),
            unit('index.noscript', 'Admin needs JavaScript.', '<target state="new">Admin needs JavaScript.</target>', 'src/index.html')
        ], 'de'));
    });
});