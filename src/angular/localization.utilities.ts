import { FsUtilities, LogUtilities, Path, PathUtilities, Question } from '../encapsulation';
import { NpmUtilities } from '../npm';
import { TemplatePlaceholders } from '../templates';
import { TsConfig, TsConfigUtilities } from '../tsconfig';
import { DeepPartial } from '../types';
import { AngularJson, AngularJsonLocale } from './angular-json.model';
import { AngularLanguage } from './angular-language.model';
import { AngularUtilities } from './angular.utilities';

const LANGUAGE_REGEX: RegExp = /^[a-z]{2}(-[A-Z]{2})?$/;

/**
 * The languages of the Angular projects Monux generates, the website and the app alike: Angular's i18n with a build of
 * every language, below its code, or at the root with one. The texts of the project and of the @service-soft libraries
 * are marked with $localize and i18n, and "npm run i18n" collects them into a translation of every other language.
 */
export abstract class LocalizationUtilities {
    /**
     * Resolves the question of mx add for the languages of a project, as a list separated by commas.
     * @param projectKind - What the project is, as the question names it, like "website".
     * @returns The question, whose answer is the codes of the languages.
     */
    static resolveLanguagesQuestion(projectKind: string): Question {
        return {
            type: 'input',
            name: 'languages',
            message: `Languages of the ${projectKind}, the one it is written in first, like "en, de"`,
            default: 'en',
            filter: (v: string) => this.splitLanguages(v),
            // given the input before or after the filter, depending on the prompt
            validate: (v?: string | string[]) => this.validateLanguages(typeof v === 'string' ? this.splitLanguages(v) : v)
        };
    }

    /**
     * Validates the languages of a project, the one it is written in first.
     * @param languages - The codes of the languages.
     * @returns True, or what is wrong with them.
     */
    static validateLanguages(languages?: string[]): true | string {
        if (!languages?.length) {
            return 'The project needs at least one language';
        }
        if (new Set(languages).size !== languages.length) {
            return 'Every language can only be given once';
        }
        const invalid: string | undefined = languages.find(language => !LANGUAGE_REGEX.test(language));
        return invalid == undefined ? true : `"${invalid}" is no code of a language like "en" or "de-AT"`;
    }

    /**
     * Resolves the languages of a project: each other one below its code, where Angular builds it by default, and a
     * single one at the root. Each with its name in itself, which is how its speakers find it, like "Deutsch" for "de".
     * @param codes - The codes of the languages, the one the project is written in first.
     * @returns The languages.
     */
    static resolveLanguages(codes: string[]): AngularLanguage[] {
        return codes.map(code => {
            const name: string = new Intl.DisplayNames([code], { type: 'language' }).of(code) ?? code;
            return {
                code,
                subPath: codes.length > 1 ? code : '',
                label: name.charAt(0).toLocaleUpperCase(code) + name.slice(1)
            };
        });
    }

    /**
     * Resolves the placeholders of src/app/languages.ts of the angular template: the languages for the seo and the
     * server, and for the language switcher, one in each line.
     * @param languages - The languages of the project.
     * @returns The placeholders.
     */
    static resolveTemplatePlaceholders(languages: AngularLanguage[]): TemplatePlaceholders {
        const locales: string = languages.map(l => `{ code: '${l.code}', subPath: '${l.subPath}' }`).join(',\n    ');
        const switcherLanguages: string = languages.map(l => this.resolveSwitcherLanguage(l)).join(',\n    ');
        return { locales: `[\n    ${locales}\n]`, languages: `[\n    ${switcherLanguages}\n]` };
    }

    /**
     * Sets a project up for its languages, once its templates are written and its dependencies installed: the types of
     * $localize for the lint, the i18n of angular.json with a build of every language, and "npm run i18n".
     * @param root - The directory of the project.
     * @param name - The name of the project.
     * @param languages - The languages of the project.
     */
    static async configure(root: Path, name: string, languages: AngularLanguage[]): Promise<void> {
        // the lint checks the code with the types of $localize, like the build
        const tsConfigPath: Path = PathUtilities.resolve(root, 'tsconfig.eslint.json');
        const tsConfig: TsConfig = await FsUtilities.parseFileAs(tsConfigPath);
        const types: string[] = [...tsConfig.compilerOptions.types ?? [], '@angular/localize'];
        await TsConfigUtilities.update(tsConfigPath, { compilerOptions: { types } });

        const [source, ...translated] = languages;
        const locales: [string, AngularJsonLocale][] = translated.map(l => {
            return [l.code, { translation: this.resolveTranslationPath(l), subPath: l.subPath }];
        });
        const angularJson: DeepPartial<AngularJson> = {
            projects: {
                [name]: {
                    i18n: {
                        sourceLocale: { code: source.code, subPath: source.subPath },
                        locales: Object.fromEntries(locales)
                    },
                    architect: {
                        build: {
                            // a build of every language, each with its texts filled in
                            options: { localize: true },
                            // the dev server builds one language, at the root. Another one to check its translation
                            configurations: { development: { localize: [source.code] } }
                        }
                    }
                }
            }
        };
        await AngularUtilities.updateAngularJson(PathUtilities.resolve(root, 'angular.json'), angularJson);
        await NpmUtilities.updatePackageJson(name, {
            // the texts marked for translation, into the translation of every other language, see scripts/translations.mjs
            scripts: { i18n: 'ng extract-i18n --output-path src/locale && node scripts/translations.mjs' }
        });
    }

    /**
     * Extracts the texts the project and the libraries mark with i18n and $localize, and gives every other language a
     * translation of them, in the language the project is written in until someone translates it.
     * @param name - The name of the project.
     * @param languages - The languages of the project.
     */
    static async collectTexts(name: string, languages: AngularLanguage[]): Promise<void> {
        LogUtilities.step('Collecting the texts for the translations');
        await NpmUtilities.run(name, 'i18n', false);
        const translations: string[] = languages.slice(1).map(l => this.resolveTranslationPath(l));
        if (translations.length) {
            LogUtilities.warning(`Translate the texts in ${translations.join(', ')}. Until then they are in "${languages[0].code}"`);
        }
    }

    /**
     * Resolves the words the spell check of the project needs for its languages: the format of the translations and
     * the names of the languages.
     * @param languages - The languages of the project.
     * @returns The words.
     */
    static resolveWords(languages: AngularLanguage[]): string[] {
        return ['xliff', ...languages.map(l => l.label)];
    }

    private static splitLanguages(input: string): string[] {
        return input
            .split(',')
            .map(language => language.trim())
            .filter(language => language !== '');
    }

    private static resolveSwitcherLanguage(language: AngularLanguage): string {
        return `{ code: '${language.code}', label: '${language.label}', subPath: '${language.subPath}' }`;
    }

    private static resolveTranslationPath(language: AngularLanguage): string {
        return `src/locale/messages.${language.code}.xlf`;
    }
}